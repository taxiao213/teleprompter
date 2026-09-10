import { createRequire } from 'node:module'
import type { AsrEngine, AsrResultEvent } from './AsrEngine'
import { modelDir, modelFiles } from './modelManager'

// CJS require for the native module (it's CommonJS; electron-vite already
// injects its own `require` shim into the ESM bundle, hence the odd name).
const requireNative = createRequire(import.meta.url)

const PARTIAL_THROTTLE_MS = 100

interface SherpaOnlineStream {
  acceptWaveform(obj: { samples: Float32Array; sampleRate: number }): void
}
interface SherpaOnlineRecognizer {
  createStream(): SherpaOnlineStream
  isReady(stream: SherpaOnlineStream): boolean
  decode(stream: SherpaOnlineStream): void
  isEndpoint(stream: SherpaOnlineStream): boolean
  reset(stream: SherpaOnlineStream): void
  getResult(stream: SherpaOnlineStream): { text: string }
}
interface SherpaModule {
  OnlineRecognizer: new (config: unknown) => SherpaOnlineRecognizer
}

/**
 * Streaming bilingual (zh/en) zipformer via sherpa-onnx-node (N-API, so the
 * prebuilt binary loads in Electron without an ABI rebuild — verified by spike).
 */
export class SherpaNativeEngine implements AsrEngine {
  private recognizer: SherpaOnlineRecognizer | null = null
  private stream: SherpaOnlineStream | null = null
  private listener: ((result: AsrResultEvent) => void) | null = null
  private lastPartialAt = 0
  private lastPartialText = ''

  onResult(callback: (result: AsrResultEvent) => void): void {
    this.listener = callback
  }

  async start(): Promise<void> {
    const sherpa = requireNative('sherpa-onnx-node') as SherpaModule
    const files = modelFiles(modelDir())

    this.recognizer = new sherpa.OnlineRecognizer({
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        transducer: {
          encoder: files.encoder,
          decoder: files.decoder,
          joiner: files.joiner,
        },
        tokens: files.tokens,
        numThreads: 2,
        provider: 'cpu',
        debug: 0,
      },
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      enableEndpointDetection: 1,
      rule1MinTrailingSilence: 2.4,
      rule2MinTrailingSilence: 1.2,
      rule3MinTrailingSilence: 0,
      blankPenalty: 0,
    })
    this.stream = this.recognizer.createStream()
  }

  feed(samples: Float32Array): void {
    if (!this.recognizer || !this.stream) return
    this.stream.acceptWaveform({ samples, sampleRate: 16000 })

    while (this.recognizer.isReady(this.stream)) {
      this.recognizer.decode(this.stream)
    }

    const isEndpoint = this.recognizer.isEndpoint(this.stream)
    const text = this.recognizer.getResult(this.stream).text

    if (isEndpoint) {
      this.recognizer.reset(this.stream)
      this.emit({ text, isEndpoint: true })
      this.lastPartialText = ''
      return
    }

    // Throttle partials and skip duplicates — decode() runs per PCM chunk.
    const now = Date.now()
    if (text !== this.lastPartialText && now - this.lastPartialAt >= PARTIAL_THROTTLE_MS) {
      this.lastPartialAt = now
      this.lastPartialText = text
      this.emit({ text, isEndpoint: false })
    }
  }

  stop(): void {
    this.stream = null
    this.recognizer = null
    this.lastPartialText = ''
  }

  private emit(result: AsrResultEvent): void {
    this.listener?.(result)
  }
}
