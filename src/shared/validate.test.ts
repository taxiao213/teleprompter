import { describe, expect, it } from 'vitest'
import {
  asId,
  asPlaybackCommand,
  asResizeArgs,
  asScriptInput,
  asSettingsPatch,
} from './validate'

describe('asId', () => {
  it('accepts normal ids', () => {
    expect(asId('abc-123')).toBe('abc-123')
  })
  it('rejects empty, non-string, and oversized ids', () => {
    expect(asId('')).toBeNull()
    expect(asId(42)).toBeNull()
    expect(asId(null)).toBeNull()
    expect(asId('x'.repeat(65))).toBeNull()
  })
})

describe('asPlaybackCommand', () => {
  it('passes through simple commands', () => {
    expect(asPlaybackCommand({ type: 'toggle' })).toEqual({ type: 'toggle' })
    expect(asPlaybackCommand({ type: 'stop' })).toEqual({ type: 'stop' })
  })
  it('requires a valid scriptId for start', () => {
    expect(asPlaybackCommand({ type: 'start', scriptId: 's1' })).toEqual({
      type: 'start',
      scriptId: 's1',
    })
    expect(asPlaybackCommand({ type: 'start' })).toBeNull()
    expect(asPlaybackCommand({ type: 'start', scriptId: 7 })).toBeNull()
  })
  it('clamps setSpeed into the allowed range', () => {
    expect(asPlaybackCommand({ type: 'setSpeed', value: 99999 })).toEqual({
      type: 'setSpeed',
      value: 600,
    })
    expect(asPlaybackCommand({ type: 'setSpeed', value: -5 })).toEqual({
      type: 'setSpeed',
      value: 10,
    })
  })
  it('rejects unknown types and non-finite numbers', () => {
    expect(asPlaybackCommand({ type: 'destroy' })).toBeNull()
    expect(asPlaybackCommand('toggle')).toBeNull()
    expect(asPlaybackCommand(null)).toBeNull()
    expect(asPlaybackCommand({ type: 'setSpeed', value: Number.NaN })).toBeNull()
    expect(asPlaybackCommand({ type: 'adjustSpeed', delta: Number.POSITIVE_INFINITY })).toBeNull()
  })
})

describe('asResizeArgs', () => {
  it('accepts valid edges and clamps deltas', () => {
    expect(asResizeArgs('se', 12, -8)).toEqual({ edge: 'se', dx: 12, dy: -8 })
    expect(asResizeArgs('n', 9999, -9999)).toEqual({ edge: 'n', dx: 500, dy: -500 })
  })
  it('rejects invalid edges and deltas', () => {
    expect(asResizeArgs('middle', 1, 1)).toBeNull()
    expect(asResizeArgs('e', 'x', 1)).toBeNull()
  })
})

describe('asScriptInput', () => {
  it('treats missing input as an empty patch', () => {
    expect(asScriptInput(undefined)).toEqual({})
    expect(asScriptInput(null)).toEqual({})
  })
  it('accepts title/content within limits', () => {
    expect(asScriptInput({ title: 'Hi', content: 'Body' })).toEqual({ title: 'Hi', content: 'Body' })
  })
  it('rejects oversized or wrongly typed fields', () => {
    expect(asScriptInput({ title: 't'.repeat(201) })).toBeNull()
    expect(asScriptInput({ content: 5 })).toBeNull()
    expect(asScriptInput('nope')).toBeNull()
  })
})

describe('asSettingsPatch', () => {
  it('accepts and clamps numeric fields', () => {
    expect(asSettingsPatch({ fontSize: 9999 })).toEqual({ fontSize: 200 })
    expect(asSettingsPatch({ fontSize: 1 })).toEqual({ fontSize: 12 })
    expect(asSettingsPatch({ backgroundOpacity: 1.5 })).toEqual({ backgroundOpacity: 1 })
  })
  it('drops unknown keys', () => {
    expect(asSettingsPatch({ fontSize: 48, evil: true })).toEqual({ fontSize: 48 })
  })
  it('enforces boolean types', () => {
    expect(asSettingsPatch({ stealth: true, followMode: false })).toEqual({
      stealth: true,
      followMode: false,
    })
    expect(asSettingsPatch({ stealth: 'yes' })).toBeNull()
  })
  it('validates colors and font family format', () => {
    expect(asSettingsPatch({ textColor: '#a1B2c3' })).toEqual({ textColor: '#a1B2c3' })
    expect(asSettingsPatch({ textColor: 'red' })).toBeNull()
    expect(asSettingsPatch({ textColor: '#12345' })).toBeNull()
    expect(asSettingsPatch({ fontFamily: 'PingFang SC, sans-serif' })).toEqual({
      fontFamily: 'PingFang SC, sans-serif',
    })
    expect(asSettingsPatch({ fontFamily: 'x;}</style><script>' })).toBeNull()
  })
  it('validates enum fields', () => {
    expect(asSettingsPatch({ textAlign: 'center' })).toEqual({ textAlign: 'center' })
    expect(asSettingsPatch({ textAlign: 'justify' })).toBeNull()
    expect(asSettingsPatch({ language: 'fr-FR' })).toBeNull()
  })
  it('validates shortcut accelerators', () => {
    expect(
      asSettingsPatch({ shortcuts: { togglePlay: 'Space', speedUp: 'CmdOrCtrl+Up' } }),
    ).toEqual({ shortcuts: { togglePlay: 'Space', speedUp: 'CmdOrCtrl+Up' } })
    // Modifier with no key, and key with illegal characters.
    expect(asSettingsPatch({ shortcuts: { togglePlay: 'Shift+' } })).toBeNull()
    expect(asSettingsPatch({ shortcuts: { togglePlay: '<script>' } })).toBeNull()
    expect(asSettingsPatch({ shortcuts: { togglePlay: 'NotARealKeyName' } })).toBeNull()
  })
  it('rejects non-object patches', () => {
    expect(asSettingsPatch(null)).toBeNull()
    expect(asSettingsPatch('fontSize')).toBeNull()
  })
})
