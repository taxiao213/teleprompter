/** A single prompting script (台本). */
export interface Script {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

/** Result of importing script files (markdown/txt) from disk. */
export interface ImportResult {
  imported: Script[]
  /** Base names of files skipped because they were unreadable or oversized. */
  skipped: string[]
}

export type LanguageSetting = 'auto' | 'zh-CN' | 'en-US'
export type ResolvedLanguage = 'zh-CN' | 'en-US'

export type TextAlign = 'left' | 'center'

/** Accelerator strings for global shortcuts (Electron `globalShortcut` format). */
export interface ShortcutMap {
  togglePlay: string
  speedUp: string
  speedDown: string
  reset: string
}

export interface TeleprompterSettings {
  fontSize: number
  fontFamily: string
  textColor: string
  backgroundColor: string
  /** 0 (fully transparent) – 1 (opaque). */
  backgroundOpacity: number
  lineHeight: number
  letterSpacing: number
  textAlign: TextAlign
  /** Base scroll speed in px/s. */
  speed: number
  mirrorHorizontal: boolean
  mirrorVertical: boolean
  /** Speech-following: scroll follows the speaker's voice instead of constant speed. */
  followMode: boolean
  /** Hide the prompter window from screen capture / screenshots. */
  stealth: boolean
  clickThrough: boolean
  alwaysOnTop: boolean
  language: LanguageSetting
  shortcuts: ShortcutMap
}

/** Partial settings update; shortcut keys may be patched individually. */
export type SettingsPatch = Partial<Omit<TeleprompterSettings, 'shortcuts'>> & {
  shortcuts?: Partial<ShortcutMap>
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused'

export interface PlaybackState {
  status: PlaybackStatus
  /** Current scroll speed in px/s (starts from settings.speed, adjustable live). */
  speed: number
  scriptId: string | null
  /**
   * Monotonic counter bumped on every start/reset — the teleprompter window
   * resets its scroll offset whenever this changes.
   */
  epoch: number
}

export type PlaybackCommand =
  | { type: 'start'; scriptId: string }
  | { type: 'stop' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'setSpeed'; value: number }
  | { type: 'adjustSpeed'; delta: number }
  | { type: 'reset' }

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface SelfTestResult {
  /** true = window confirmed invisible to capture; false = it leaked; null = inconclusive. */
  invisible: boolean | null
  detail: string
  capturedAt: number
}

export const PLAYBACK_SPEED_MIN = 10
export const PLAYBACK_SPEED_MAX = 600

// --- speech following (M2) ---

export type AsrState =
  | 'idle'
  | 'no-model'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error'

export interface AsrStatusInfo {
  state: AsrState
  /** Download progress 0–1 when state === 'downloading'. */
  progress?: number
  /** Machine-readable error key, translated in the UI. */
  error?: string
}

export interface AsrResultEvent {
  /** Current partial (or just-finalized) recognized text. */
  text: string
  isEndpoint: boolean
}
