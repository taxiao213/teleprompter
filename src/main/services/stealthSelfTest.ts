import { desktopCapturer, screen, type BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipcChannels'
import type { SelfTestResult } from '../../shared/types'
import { getSettings } from './settingsService'

const PREPARE_SETTLE_MS = 400
/** Magenta probe flashed by the teleprompter renderer during the test. */
const PROBE = { r: 255, g: 0, b: 255 }
const COLOR_TOLERANCE = 60
const SAMPLE_STEP = 4
const LEAK_RATIO_THRESHOLD = 0.3

/**
 * Stealth self-test: ask the teleprompter window to paint itself solid magenta,
 * capture the screen the way recording software would, then check whether the
 * probe color shows up inside the window's bounds. If it doesn't, the window
 * is invisible to capture on this machine.
 */
export async function runStealthSelfTest(win: BrowserWindow): Promise<SelfTestResult> {
  const capturedAt = Date.now()
  try {
    if (!getSettings().stealth) {
      return { invisible: false, detail: 'protection-disabled', capturedAt }
    }
    if (!win.isVisible()) win.showInactive()

    win.webContents.send(IPC.SelfTestPrepare)
    await delay(PREPARE_SETTLE_MS)

    const display = screen.getDisplayMatching(win.getBounds())
    const scale = display.scaleFactor || 1
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.ceil(display.size.width * scale),
        height: Math.ceil(display.size.height * scale),
      },
    })
    // Strict display match: on multi-monitor setups falling back to sources[0]
    // could sample the wrong screen and produce a meaningless verdict.
    const source = sources.find((s) => s.display_id === String(display.id))

    if (!source) {
      return { invisible: null, detail: 'display-not-found', capturedAt }
    }
    if (source.thumbnail.isEmpty()) {
      // On macOS this usually means the app lacks Screen Recording permission —
      // ironically the same permission recording software needs. Report inconclusive.
      return { invisible: null, detail: 'capture-unavailable', capturedAt }
    }

    // NativeImage has no explicit destroy API; toBitmap() copies pixels into
    // a JS buffer and the thumbnail itself is released by GC.
    const leaked = probeVisibleInThumbnail(win, source.thumbnail)
    return {
      invisible: !leaked,
      detail: leaked ? 'leaked' : 'invisible',
      capturedAt,
    }
  } catch (error) {
    return {
      invisible: null,
      detail: `error:${error instanceof Error ? error.message : String(error)}`,
      capturedAt,
    }
  } finally {
    if (!win.isDestroyed()) win.webContents.send(IPC.SelfTestDone)
  }
}

function probeVisibleInThumbnail(win: BrowserWindow, thumbnail: Electron.NativeImage): boolean {
  const size = thumbnail.getSize()
  if (size.width === 0 || size.height === 0) return false

  const display = screen.getDisplayMatching(win.getBounds())
  const scaleX = size.width / display.size.width
  const scaleY = size.height / display.size.height
  const bounds = win.getBounds()

  const left = Math.max(0, Math.floor((bounds.x - display.bounds.x) * scaleX))
  const top = Math.max(0, Math.floor((bounds.y - display.bounds.y) * scaleY))
  const right = Math.min(size.width, Math.ceil(left + bounds.width * scaleX))
  const bottom = Math.min(size.height, Math.ceil(top + bounds.height * scaleY))

  const bitmap = thumbnail.toBitmap() // BGRA byte order
  let hits = 0
  let samples = 0
  for (let y = top; y < bottom; y += SAMPLE_STEP) {
    for (let x = left; x < right; x += SAMPLE_STEP) {
      const i = (y * size.width + x) * 4
      const b = bitmap[i]
      const g = bitmap[i + 1]
      const r = bitmap[i + 2]
      samples += 1
      if (
        Math.abs(r - PROBE.r) < COLOR_TOLERANCE &&
        Math.abs(g - PROBE.g) < COLOR_TOLERANCE &&
        Math.abs(b - PROBE.b) < COLOR_TOLERANCE
      ) {
        hits += 1
      }
    }
  }
  return samples > 0 && hits / samples > LEAK_RATIO_THRESHOLD
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
