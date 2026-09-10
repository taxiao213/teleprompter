import type { PlaybackState, TeleprompterSettings } from './types'

export const DEFAULT_SETTINGS: TeleprompterSettings = {
  fontSize: 48,
  fontFamily: 'system-ui',
  textColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.35,
  lineHeight: 1.5,
  letterSpacing: 0,
  textAlign: 'left',
  speed: 120,
  mirrorHorizontal: false,
  mirrorVertical: false,
  followMode: false,
  stealth: true,
  clickThrough: false,
  alwaysOnTop: true,
  language: 'auto',
  shortcuts: {
    togglePlay: 'Space',
    speedUp: 'Up',
    speedDown: 'Down',
    reset: 'R',
  },
}

export const INITIAL_PLAYBACK: PlaybackState = {
  status: 'idle',
  speed: DEFAULT_SETTINGS.speed,
  scriptId: null,
  epoch: 0,
}

export const TELEPROMPTER_MIN_WIDTH = 240
export const TELEPROMPTER_MIN_HEIGHT = 120
export const TELEPROMPTER_DEFAULT_WIDTH = 960
export const TELEPROMPTER_DEFAULT_HEIGHT = 320

/** Solid color the teleprompter flashes during the stealth self-test. */
export const SELFTEST_PROBE_COLOR = '#ff00ff'
