import { systemPreferences } from 'electron'
import { IPC } from '../../../shared/ipcChannels'
import type { AsrResultEvent, AsrStatusInfo } from '../../../shared/types'
import { broadcast } from '../broadcast'
import type { AsrEngine } from './AsrEngine'
import { SherpaNativeEngine } from './SherpaNativeEngine'
import { downloadModel, isModelReady } from './modelManager'

let status: AsrStatusInfo = { state: 'idle' }
let engine: AsrEngine | null = null
let downloading = false

export function getAsrStatus(): AsrStatusInfo {
  return { ...status }
}

function setStatus(patch: Partial<AsrStatusInfo>): void {
  status = { ...status, ...patch }
  broadcast(IPC.AsrStatus, getAsrStatus())
}

/** Start the engine if the model is present; otherwise report no-model. */
export async function startAsr(): Promise<void> {
  if (engine || status.state === 'loading' || status.state === 'ready') return

  if (!(await isModelReady())) {
    setStatus({ state: 'no-model', progress: undefined, error: undefined })
    return
  }

  if (process.platform === 'darwin') {
    // askForMediaAccess only prompts while 'not-determined'; after a denial it
    // returns false without prompting, so check the current status first.
    const access = systemPreferences.getMediaAccessStatus('microphone')
    if (access === 'not-determined') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      if (!granted) {
        setStatus({ state: 'error', error: 'mic-denied' })
        return
      }
    } else if (access !== 'granted') {
      setStatus({ state: 'error', error: 'mic-denied' })
      return
    }
  }

  setStatus({ state: 'loading', error: undefined })
  try {
    const next: AsrEngine = new SherpaNativeEngine()
    next.onResult((result: AsrResultEvent) => broadcast(IPC.AsrResult, result))
    await next.start()
    engine = next
    setStatus({ state: 'ready' })
  } catch (error) {
    engine = null
    setStatus({
      state: 'error',
      error: `engine:${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
    })
  }
}

export function stopAsr(): void {
  engine?.stop()
  engine = null
  setStatus({ state: 'idle', progress: undefined, error: undefined })
}

/** Feed one 16 kHz mono Int16 PCM chunk from the teleprompter renderer. */
export function feedAsr(buffer: ArrayBuffer): void {
  if (!engine) return
  const int16 = new Int16Array(buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i += 1) {
    float32[i] = int16[i] / 32768
  }
  engine.feed(float32)
}

export async function downloadAsrModel(): Promise<boolean> {
  if (downloading) return false
  downloading = true
  setStatus({ state: 'downloading', progress: 0, error: undefined })
  try {
    await downloadModel((progress) => setStatus({ state: 'downloading', progress }))
    setStatus({ state: 'idle', progress: undefined })
    return true
  } catch (error) {
    setStatus({
      state: 'error',
      progress: undefined,
      error: `download:${error instanceof Error ? error.message : String(error)}`,
    })
    return false
  } finally {
    downloading = false
  }
}
