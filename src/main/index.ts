import { app } from 'electron'
import { registerIpcHandlers } from './ipc/register'
import { unregisterGlobalShortcuts } from './services/shortcuts'
import { createEditorWindow } from './windows/editorWindow'

// Single instance: a second launch just focuses the existing editor window.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createEditorWindow()
  })

  void app.whenReady().then(() => {
    registerIpcHandlers()
    createEditorWindow()

    app.on('activate', () => {
      createEditorWindow()
    })
  })

  app.on('window-all-closed', () => {
    // Teleprompter is a utility app: closing all windows quits it everywhere,
    // including macOS (no dock-resident menu bar app in v1).
    app.quit()
  })

  app.on('will-quit', () => {
    unregisterGlobalShortcuts()
  })
}
