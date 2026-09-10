// The worklet must be loaded from a real same-origin file URL: Vite would
// inline this tiny file as a data: URI (and blob: URLs also fail) — Chromium's
// AudioWorklet.addModule rejects both with AbortError, silently killing follow
// mode. assetsInlineLimit: 0 in the renderer build guarantees a real file.
import workletUrl from './pcm-worklet.js?url'

const TARGET_SAMPLE_RATE = 16000
/** Post a PCM chunk roughly every 40 ms. */
const CHUNK_MS = 40

/**
 * Captures microphone audio in the teleprompter window and ships 16 kHz mono
 * Int16 chunks to the main process ASR engine.
 */
export class AudioCapture {
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private node: AudioWorkletNode | null = null
  private pending: Float32Array[] = []
  private pendingSamples = 0

  async start(onChunk: (pcm: ArrayBuffer) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })
    this.context = new AudioContext()
    await this.context.audioWorklet.addModule(workletUrl)
    const source = this.context.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.context, 'pcm-forwarder')

    const chunkTarget = (TARGET_SAMPLE_RATE * CHUNK_MS) / 1000
    this.node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      const resampled = resampleTo16k(event.data, this.context?.sampleRate ?? 48000)
      this.pending.push(resampled)
      this.pendingSamples += resampled.length
      if (this.pendingSamples >= chunkTarget) {
        const merged = merge(this.pending, this.pendingSamples)
        this.pending = []
        this.pendingSamples = 0
        onChunk(floatToInt16(merged).buffer as ArrayBuffer)
      }
    }

    source.connect(this.node)
    // Keep the graph alive without audible feedback.
    this.node.connect(this.context.destination)
  }

  async stop(): Promise<void> {
    this.node?.disconnect()
    this.node = null
    await this.context?.close()
    this.context = null
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
    this.pending = []
    this.pendingSamples = 0
  }
}

/** Naive linear-interpolation resampler — adequate for ASR input. */
function resampleTo16k(input: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === TARGET_SAMPLE_RATE) return input
  const ratio = sourceRate / TARGET_SAMPLE_RATE
  const length = Math.floor(input.length / ratio)
  const output = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, input.length - 1)
    output[i] = input[left] + (input[right] - input[left]) * (position - left)
  }
  return output
}

function merge(chunks: Float32Array[], total: number): Float32Array {
  const output = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

function floatToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}
