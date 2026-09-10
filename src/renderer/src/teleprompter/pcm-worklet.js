/**
 * AudioWorklet processor: forwards raw input samples to the main thread.
 * Resampling to 16 kHz happens on the main thread (audioCapture.ts).
 */
class PcmForwarder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0]
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice(0))
    }
    return true
  }
}

registerProcessor('pcm-forwarder', PcmForwarder)
