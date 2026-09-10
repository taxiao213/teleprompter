import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipcChannels'
import type {
  AsrStatusInfo,
  PlaybackState,
  Script,
  TeleprompterSettings,
} from '../../shared/types'
import {
  asId,
  asPlaybackCommand,
  asResizeArgs,
  asScriptInput,
  asSettingsPatch,
} from '../../shared/validate'
import { downloadAsrModel, feedAsr, getAsrStatus, startAsr, stopAsr } from '../services/asr/asrService'
import { broadcast } from '../services/broadcast'
import { importScripts } from '../services/importScripts'
import {
  getPlaybackState,
  handlePlaybackCommand,
  refreshShortcuts,
} from '../services/playbackService'
import {
  createScript,
  deleteScript,
  getScript,
  listScripts,
  updateScript,
} from '../services/scriptRepo'
import { getSettings, patchSettings } from '../services/settingsService'
import { runStealthSelfTest } from '../services/stealthSelfTest'
import {
  applyBehaviorSettings,
  resizeTeleprompterBy,
  showTeleprompterWindow,
} from '../windows/teleprompterWindow'

export interface SyncState {
  settings: TeleprompterSettings
  playback: PlaybackState
  script: Script | null
  asr: AsrStatusInfo
}

export function registerIpcHandlers(): void {
  // --- scripts ---
  ipcMain.handle(IPC.ScriptsList, () => listScripts())
  ipcMain.handle(IPC.ScriptsGet, (_e, rawId: unknown) => {
    const id = asId(rawId)
    return id ? getScript(id) : null
  })
  ipcMain.handle(IPC.ScriptsCreate, (_e, rawInput: unknown) => {
    const input = asScriptInput(rawInput)
    if (!input) throw new Error('invalid script input')
    return createScript(input)
  })
  ipcMain.handle(IPC.ScriptsUpdate, async (_e, rawId: unknown, rawPatch: unknown) => {
    const id = asId(rawId)
    const patch = asScriptInput(rawPatch)
    if (!id || !patch) throw new Error('invalid script update')
    const updated = await updateScript(id, patch)
    // Keep the live prompter in sync when the script being prompted is edited.
    if (updated && getPlaybackState().scriptId === id) {
      broadcast(IPC.CurrentScript, updated)
    }
    return updated
  })
  ipcMain.handle(IPC.ScriptsDelete, async (_e, rawId: unknown) => {
    const id = asId(rawId)
    if (!id) return false
    // Deleting the script being prompted stops the session first.
    if (getPlaybackState().scriptId === id) {
      await handlePlaybackCommand({ type: 'stop' }).catch(() => {})
    }
    return deleteScript(id)
  })
  ipcMain.handle(IPC.ScriptsImport, (e) =>
    importScripts(BrowserWindow.fromWebContents(e.sender)),
  )

  // --- settings ---
  ipcMain.handle(IPC.SettingsGet, () => getSettings())
  ipcMain.on(IPC.SettingsPatch, (_e, rawPatch: unknown) => {
    const patch = asSettingsPatch(rawPatch)
    if (!patch) return
    const shortcutsChanged = patch.shortcuts !== undefined
    const next = patchSettings(patch)
    applyBehaviorSettings(next)
    broadcast(IPC.SettingsChanged, next)
    if (shortcutsChanged) refreshShortcuts()
  })

  // --- playback ---
  ipcMain.on(IPC.PlaybackCommand, (_e, rawCommand: unknown) => {
    const command = asPlaybackCommand(rawCommand)
    if (!command) return
    handlePlaybackCommand(command).catch((error) => {
      console.error('[playback] command failed:', error)
    })
  })

  // --- bootstrap sync for freshly loaded renderers ---
  ipcMain.handle(IPC.StateSync, async (): Promise<SyncState> => {
    const playback = getPlaybackState()
    return {
      settings: getSettings(),
      playback,
      script: playback.scriptId ? await getScript(playback.scriptId) : null,
      asr: getAsrStatus(),
    }
  })

  // --- teleprompter window geometry ---
  ipcMain.on(IPC.WindowResize, (_e, rawEdge: unknown, rawDx: unknown, rawDy: unknown) => {
    const args = asResizeArgs(rawEdge, rawDx, rawDy)
    if (args) resizeTeleprompterBy(args.edge, args.dx, args.dy)
  })

  // --- stealth self-test ---
  ipcMain.handle(IPC.SelfTestRun, async () => {
    const win = showTeleprompterWindow()
    return runStealthSelfTest(win)
  })

  // --- app meta ---
  ipcMain.handle(IPC.AppGetLocale, () => app.getLocale())
  ipcMain.on(IPC.AppOpenMicSettings, () => {
    // Deep link into Privacy > Microphone so the user can re-enable access
    // after a denial (TCC never re-prompts once denied).
    if (process.platform === 'darwin') {
      void shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      )
    }
  })

  // --- speech following (M2) ---
  ipcMain.on(IPC.AsrControl, (_e, command: unknown) => {
    const type = (command as { type?: unknown })?.type
    if (type === 'start') void startAsr()
    else if (type === 'stop') stopAsr()
  })
  ipcMain.on(IPC.AsrPcm, (_e, buffer: unknown) => {
    // Cap a single chunk at ~10s of 16 kHz Int16 audio.
    if (buffer instanceof ArrayBuffer && buffer.byteLength > 0 && buffer.byteLength <= 320_000) {
      feedAsr(buffer)
    }
  })
  ipcMain.handle(IPC.AsrStatus, () => getAsrStatus())
  ipcMain.handle(IPC.AsrDownloadModel, () => downloadAsrModel())
}
