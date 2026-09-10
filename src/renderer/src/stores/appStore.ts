import { create } from 'zustand'
import { DEFAULT_SETTINGS, INITIAL_PLAYBACK } from '../../../shared/defaults'
import type {
  AsrStatusInfo,
  PlaybackState,
  Script,
  TeleprompterSettings,
} from '../../../shared/types'

/**
 * Per-window app store. Each renderer process holds its own copy; the main
 * process is the authority and pushes updates via IPC subscriptions
 * (wired up in bootstrap.ts).
 */
interface AppState {
  settings: TeleprompterSettings
  playback: PlaybackState
  script: Script | null
  asr: AsrStatusInfo
}

export const useAppStore = create<AppState>()(() => ({
  settings: DEFAULT_SETTINGS,
  playback: INITIAL_PLAYBACK,
  script: null,
  asr: { state: 'idle' },
}))
