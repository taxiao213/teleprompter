import { INITIAL_PLAYBACK } from '../../shared/defaults'
import { IPC } from '../../shared/ipcChannels'
import {
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  type PlaybackCommand,
  type PlaybackState,
} from '../../shared/types'
import { broadcast } from './broadcast'
import { startAsr, stopAsr } from './asr/asrService'
import { getScript } from './scriptRepo'
import { getSettings } from './settingsService'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { hideTeleprompterWindow, showTeleprompterWindow } from '../windows/teleprompterWindow'

let state: PlaybackState = { ...INITIAL_PLAYBACK }

/**
 * Commands are processed strictly in arrival order. Without this queue a
 * `stop` arriving while `startSession` awaits its script read would be
 * overwritten when the start resumed — swallowing the stop.
 */
let queue: Promise<void> = Promise.resolve()

export function getPlaybackState(): PlaybackState {
  return { ...state }
}

/**
 * Main process is the single authority for playback state: it receives
 * commands from the editor UI, global shortcuts and (later) the speech-following
 * engine, updates state, then broadcasts to both windows so they never diverge.
 */
export function handlePlaybackCommand(command: PlaybackCommand): Promise<void> {
  const run = queue.then(() => processCommand(command))
  // Keep the chain alive even if one command fails.
  queue = run.catch(() => {})
  return run
}

/** Re-apply shortcuts after a settings change while a session is active. */
export function refreshShortcuts(): void {
  if (state.status === 'idle') return
  registerGlobalShortcuts(getSettings().shortcuts, (cmd) => {
    void handlePlaybackCommand(cmd).catch(() => {})
  })
}

async function processCommand(command: PlaybackCommand): Promise<void> {
  switch (command.type) {
    case 'start':
      await startSession(command.scriptId)
      break
    case 'stop':
      stopSession()
      break
    case 'play':
      if (state.status === 'paused') setState({ status: 'playing' })
      break
    case 'pause':
      if (state.status === 'playing') setState({ status: 'paused' })
      break
    case 'toggle':
      if (state.status === 'playing') setState({ status: 'paused' })
      else if (state.status === 'paused') setState({ status: 'playing' })
      break
    case 'setSpeed':
      setState({ speed: clampSpeed(command.value) })
      break
    case 'adjustSpeed':
      setState({ speed: clampSpeed(state.speed + command.delta) })
      break
    case 'reset':
      if (state.status !== 'idle') setState({ epoch: state.epoch + 1, status: 'paused' })
      break
  }
}

async function startSession(scriptId: string): Promise<void> {
  const script = await getScript(scriptId)
  if (!script) return
  // The queue serializes commands, so state cannot have changed underneath us
  // — but a stop queued behind us will still run right after, as expected.

  showTeleprompterWindow()
  setState({
    status: 'paused',
    speed: getSettings().speed,
    scriptId,
    epoch: state.epoch + 1,
  })
  broadcast(IPC.CurrentScript, script)
  refreshShortcuts()
  // Speech-following: warm up the ASR engine alongside the session.
  if (getSettings().followMode) void startAsr()
}

function stopSession(): void {
  setState({ status: 'idle', scriptId: null })
  unregisterGlobalShortcuts()
  stopAsr()
  hideTeleprompterWindow()
}

function setState(patch: Partial<PlaybackState>): void {
  state = { ...state, ...patch }
  broadcast(IPC.PlaybackState, getPlaybackState())
}

function clampSpeed(value: number): number {
  return Math.min(PLAYBACK_SPEED_MAX, Math.max(PLAYBACK_SPEED_MIN, Math.round(value)))
}
