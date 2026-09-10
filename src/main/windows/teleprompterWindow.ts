import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import {
  TELEPROMPTER_DEFAULT_HEIGHT,
  TELEPROMPTER_DEFAULT_WIDTH,
  TELEPROMPTER_MIN_HEIGHT,
  TELEPROMPTER_MIN_WIDTH,
} from '../../shared/defaults'
import type { ResizeEdge, TeleprompterSettings } from '../../shared/types'
import { getSettings, getUiState, patchUiState } from '../services/settingsService'

let teleprompterWindow: BrowserWindow | null = null

export function getTeleprompterWindow(): BrowserWindow | null {
  return teleprompterWindow && !teleprompterWindow.isDestroyed() ? teleprompterWindow : null
}

/** Drop saved bounds that no longer intersect any connected display. */
function visibleSavedBounds(): { x: number; y: number } | undefined {
  const saved = getUiState().teleprompterBounds
  if (!saved) return undefined
  const display = screen.getDisplayMatching(saved)
  const area = display.workArea
  const overlapX = Math.min(saved.x + saved.width, area.x + area.width) - Math.max(saved.x, area.x)
  const overlapY = Math.min(saved.y + saved.height, area.y + area.height) - Math.max(saved.y, area.y)
  // Require a meaningful chunk on screen; otherwise fall back to default placement.
  if (overlapX < 100 || overlapY < 60) return undefined
  return { x: saved.x, y: saved.y }
}

export function createTeleprompterWindow(): BrowserWindow {
  const existing = getTeleprompterWindow()
  if (existing) return existing

  const settings = getSettings()
  const saved = getUiState().teleprompterBounds
  const position = visibleSavedBounds()

  const win = new BrowserWindow({
    width: saved?.width ?? TELEPROMPTER_DEFAULT_WIDTH,
    height: saved?.height ?? TELEPROMPTER_DEFAULT_HEIGHT,
    x: position?.x,
    y: position?.y,
    minWidth: TELEPROMPTER_MIN_WIDTH,
    minHeight: TELEPROMPTER_MIN_HEIGHT,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/teleprompter.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  teleprompterWindow = win
  applyBehaviorSettings(settings)

  // Keep the prompter above fullscreen apps (Keynote slides, games, etc.).
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  win.on('close', () => {
    if (!win.isDestroyed()) patchUiState({ teleprompterBounds: win.getBounds() })
  })
  win.on('closed', () => {
    teleprompterWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/teleprompter.html`)
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/teleprompter.html'))
  }
  return win
}

export function showTeleprompterWindow(): BrowserWindow {
  const win = createTeleprompterWindow()
  if (!win.isVisible()) win.showInactive()
  return win
}

export function hideTeleprompterWindow(): void {
  const win = getTeleprompterWindow()
  if (win?.isVisible()) win.hide()
}

/**
 * Window-behavior settings are applied by the main process because they map
 * to native window APIs. Runtime-toggleable, no window rebuild needed.
 */
export function applyBehaviorSettings(settings: TeleprompterSettings): void {
  const win = getTeleprompterWindow()
  if (!win) return
  // The stealth toggle: WDA_EXCLUDEFROMCAPTURE on Win10 2004+, NSWindowSharingNone on macOS.
  win.setContentProtection(settings.stealth)
  win.setIgnoreMouseEvents(settings.clickThrough, { forward: true })
  if (settings.alwaysOnTop) {
    win.setAlwaysOnTop(true, 'screen-saver')
  } else {
    win.setAlwaysOnTop(false)
  }
}

/** Edge-drag resize from the renderer (frameless windows get no native resize on Windows). */
export function resizeTeleprompterBy(edge: ResizeEdge, dx: number, dy: number): void {
  const win = getTeleprompterWindow()
  if (!win) return
  const bounds = win.getBounds()
  let { x, y, width, height } = bounds

  if (edge.includes('e')) width += dx
  if (edge.includes('s')) height += dy
  if (edge.includes('w')) {
    x += dx
    width -= dx
  }
  if (edge.includes('n')) {
    y += dy
    height -= dy
  }

  width = Math.max(width, TELEPROMPTER_MIN_WIDTH)
  height = Math.max(height, TELEPROMPTER_MIN_HEIGHT)
  win.setBounds({ x, y, width, height })
}
