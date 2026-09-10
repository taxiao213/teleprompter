import type { AsrResultEvent } from '../../../shared/types'

/**
 * Abstraction over the ASR backend so the native sherpa-onnx binding can be
 * swapped for the WASM build if native packaging ever fails on a platform.
 */
export interface AsrEngine {
  /** Load the model and prepare a stream. Throws on failure. */
  start(): Promise<void>
  /** Feed 16 kHz mono PCM samples. */
  feed(samples: Float32Array): void
  /** Release the stream and native resources. */
  stop(): void
  onResult(callback: (result: AsrResultEvent) => void): void
}

export type { AsrResultEvent }
