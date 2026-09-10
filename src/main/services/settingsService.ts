import Store from 'electron-store'
import { DEFAULT_SETTINGS } from '../../shared/defaults'
import type { SettingsPatch, ShortcutMap, TeleprompterSettings } from '../../shared/types'

interface UiState {
  teleprompterBounds?: { x: number; y: number; width: number; height: number }
}

interface StoreSchema {
  settings: TeleprompterSettings
  ui: UiState
}

const store = new Store<StoreSchema>({
  defaults: { settings: DEFAULT_SETTINGS, ui: {} },
})

/** Merge stored shortcuts over defaults so newly added keys always exist. */
export function getSettings(): TeleprompterSettings {
  const stored = store.get('settings')
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...(stored?.shortcuts ?? {}) },
  }
}

export function patchSettings(patch: SettingsPatch): TeleprompterSettings {
  const current = getSettings()
  const next: TeleprompterSettings = {
    ...current,
    ...patch,
    shortcuts: mergeShortcuts(current.shortcuts, patch.shortcuts),
  }
  store.set('settings', next)
  return next
}

function mergeShortcuts(base: ShortcutMap, patch?: Partial<ShortcutMap>): ShortcutMap {
  return patch ? { ...base, ...patch } : base
}

export function getUiState(): UiState {
  return store.get('ui') ?? {}
}

export function patchUiState(patch: Partial<UiState>): void {
  store.set('ui', { ...getUiState(), ...patch })
}
