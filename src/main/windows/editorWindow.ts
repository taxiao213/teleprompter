import { BrowserWindow } from 'electron'
import { join } from 'node:path'

let editorWindow: BrowserWindow | null = null

export function getEditorWindow(): BrowserWindow | null {
  return editorWindow && !editorWindow.isDestroyed() ? editorWindow : null
}

export function createEditorWindow(): BrowserWindow {
  const existing = getEditorWindow()
  if (existing) {
    existing.focus()
    return existing
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#0a0a0b',
    title: 'Teleprompter',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/editor.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  editorWindow = win
  win.on('closed', () => {
    editorWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/editor.html`)
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/editor.html'))
  }
  return win
}
