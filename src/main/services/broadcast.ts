import { BrowserWindow } from 'electron'

/** Send a payload to every live window (editor + teleprompter). */
export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
