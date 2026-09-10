import { globalShortcut } from 'electron'
import type { PlaybackCommand, ShortcutMap } from '../../shared/types'

const registered: string[] = []

/**
 * Global shortcuts are only registered while a prompting session is active
 * (registered by the playback service on start, unregistered on stop), so
 * plain keys like Space don't hijack typing in other apps the rest of the time.
 */
export function registerGlobalShortcuts(
  map: ShortcutMap,
  onCommand: (command: PlaybackCommand) => void,
): void {
  unregisterGlobalShortcuts()
  bind(map.togglePlay, { type: 'toggle' }, onCommand)
  bind(map.speedUp, { type: 'adjustSpeed', delta: 20 }, onCommand)
  bind(map.speedDown, { type: 'adjustSpeed', delta: -20 }, onCommand)
  bind(map.reset, { type: 'reset' }, onCommand)
}

export function unregisterGlobalShortcuts(): void {
  while (registered.length > 0) {
    const accelerator = registered.pop()
    if (accelerator) globalShortcut.unregister(accelerator)
  }
}

function bind(
  accelerator: string,
  command: PlaybackCommand,
  onCommand: (command: PlaybackCommand) => void,
): void {
  try {
    if (globalShortcut.register(accelerator, () => onCommand(command))) {
      registered.push(accelerator)
    }
  } catch {
    // Invalid or conflicting accelerator — skip instead of crashing the session.
  }
}
