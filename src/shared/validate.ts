import {
  PLAYBACK_SPEED_MAX,
  PLAYBACK_SPEED_MIN,
  type PlaybackCommand,
  type ResizeEdge,
  type Script,
  type SettingsPatch,
  type ShortcutMap,
} from './types'

/**
 * Runtime validators for every IPC payload crossing renderer -> main.
 * TypeScript types are erased at runtime; the renderer could send anything,
 * so the main process validates at this boundary before touching services
 * or native window APIs.
 */

export const MAX_TITLE_LENGTH = 200
export const MAX_CONTENT_LENGTH = 200_000
const MAX_ID_LENGTH = 64
const MAX_RESIZE_DELTA = 500
const MAX_SPEED_DELTA = 100
const MAX_ACCELERATOR_LENGTH = 60

const RESIZE_EDGES: readonly ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const ACCELERATOR_MODIFIERS = new Set([
  'commandorcontrol',
  'cmdorctrl',
  'command',
  'cmd',
  'control',
  'ctrl',
  'alt',
  'option',
  'shift',
  'super',
  'meta',
])
// Single-token named keys per Electron's accelerator docs (common subset).
const ACCELERATOR_NAMED_KEYS = new Set([
  'space', 'tab', 'enter', 'return', 'escape', 'esc', 'backspace', 'delete',
  'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown',
  'plus', 'minus', 'printscreen',
  ...Array.from({ length: 24 }, (_, i) => `f${i + 1}`),
])

function isAccelerator(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ACCELERATOR_LENGTH) {
    return false
  }
  if (!/^[A-Za-z0-9+]+$/.test(value)) return false
  const tokens = value.split('+').filter((t) => t !== '')
  if (tokens.length === 0) return false
  return tokens.every((token, index) => {
    const lower = token.toLowerCase()
    if (ACCELERATOR_MODIFIERS.has(lower)) return index < tokens.length - 1
    if (ACCELERATOR_NAMED_KEYS.has(lower)) return true
    return token.length === 1 // single printable character
  })
}

function clampNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(max, Math.max(min, value))
}

export function asId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH
    ? value
    : null
}

export function asPlaybackCommand(value: unknown): PlaybackCommand | null {
  if (typeof value !== 'object' || value === null) return null
  const cmd = value as Record<string, unknown>
  switch (cmd.type) {
    case 'stop':
    case 'play':
    case 'pause':
    case 'toggle':
    case 'reset':
      return { type: cmd.type }
    case 'start': {
      const scriptId = asId(cmd.scriptId)
      return scriptId ? { type: 'start', scriptId } : null
    }
    case 'setSpeed': {
      const speed = clampNumber(cmd.value, PLAYBACK_SPEED_MIN, PLAYBACK_SPEED_MAX)
      return speed === null ? null : { type: 'setSpeed', value: speed }
    }
    case 'adjustSpeed': {
      const delta = clampNumber(cmd.delta, -MAX_SPEED_DELTA, MAX_SPEED_DELTA)
      return delta === null ? null : { type: 'adjustSpeed', delta }
    }
    default:
      return null
  }
}

export function asResizeArgs(
  edge: unknown,
  dx: unknown,
  dy: unknown,
): { edge: ResizeEdge; dx: number; dy: number } | null {
  if (typeof edge !== 'string' || !RESIZE_EDGES.includes(edge as ResizeEdge)) return null
  const cdx = clampNumber(dx, -MAX_RESIZE_DELTA, MAX_RESIZE_DELTA)
  const cdy = clampNumber(dy, -MAX_RESIZE_DELTA, MAX_RESIZE_DELTA)
  if (cdx === null || cdy === null) return null
  return { edge: edge as ResizeEdge, dx: cdx, dy: cdy }
}

export function asScriptInput(value: unknown): Partial<Pick<Script, 'title' | 'content'>> | null {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const out: Partial<Pick<Script, 'title' | 'content'>> = {}
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.length > MAX_TITLE_LENGTH) return null
    out.title = input.title
  }
  if (input.content !== undefined) {
    if (typeof input.content !== 'string' || input.content.length > MAX_CONTENT_LENGTH) return null
    out.content = input.content
  }
  return out
}

const FONT_FAMILY_RE = /^[\w\s,"'-]{1,200}$/
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

/** Whitelist-and-clamp every field of a settings patch. Unknown keys are dropped. */
export function asSettingsPatch(value: unknown): SettingsPatch | null {
  if (typeof value !== 'object' || value === null) return null
  const input = value as Record<string, unknown>
  const patch: SettingsPatch = {}

  const number = (key: 'fontSize' | 'speed' | 'backgroundOpacity' | 'lineHeight' | 'letterSpacing', min: number, max: number): boolean => {
    if (input[key] === undefined) return true
    const v = clampNumber(input[key], min, max)
    if (v === null) return false
    ;(patch as Record<string, number>)[key] = v
    return true
  }
  const bool = (key: 'mirrorHorizontal' | 'mirrorVertical' | 'followMode' | 'stealth' | 'clickThrough' | 'alwaysOnTop'): boolean => {
    if (input[key] === undefined) return true
    if (typeof input[key] !== 'boolean') return false
    ;(patch as Record<string, boolean>)[key] = input[key] as boolean
    return true
  }

  if (!number('fontSize', 12, 200)) return null
  if (!number('speed', PLAYBACK_SPEED_MIN, PLAYBACK_SPEED_MAX)) return null
  if (!number('backgroundOpacity', 0, 1)) return null
  if (!number('lineHeight', 1, 3)) return null
  if (!number('letterSpacing', 0, 20)) return null
  if (!bool('mirrorHorizontal') || !bool('mirrorVertical') || !bool('followMode')) return null
  if (!bool('stealth') || !bool('clickThrough') || !bool('alwaysOnTop')) return null

  if (input.fontFamily !== undefined) {
    if (typeof input.fontFamily !== 'string' || !FONT_FAMILY_RE.test(input.fontFamily)) return null
    patch.fontFamily = input.fontFamily
  }
  if (input.textColor !== undefined) {
    if (typeof input.textColor !== 'string' || !COLOR_RE.test(input.textColor)) return null
    patch.textColor = input.textColor
  }
  if (input.backgroundColor !== undefined) {
    if (typeof input.backgroundColor !== 'string' || !COLOR_RE.test(input.backgroundColor)) return null
    patch.backgroundColor = input.backgroundColor
  }
  if (input.textAlign !== undefined) {
    if (input.textAlign !== 'left' && input.textAlign !== 'center') return null
    patch.textAlign = input.textAlign
  }
  if (input.language !== undefined) {
    if (input.language !== 'auto' && input.language !== 'zh-CN' && input.language !== 'en-US') {
      return null
    }
    patch.language = input.language
  }
  if (input.shortcuts !== undefined) {
    const shortcuts = input.shortcuts as Record<string, unknown>
    if (typeof shortcuts !== 'object' || shortcuts === null) return null
    const validated: Partial<ShortcutMap> = {}
    for (const key of ['togglePlay', 'speedUp', 'speedDown', 'reset'] as const) {
      const accelerator = shortcuts[key]
      if (accelerator === undefined) continue
      if (!isAccelerator(accelerator)) return null
      validated[key] = accelerator
    }
    patch.shortcuts = validated
  }
  return patch
}
