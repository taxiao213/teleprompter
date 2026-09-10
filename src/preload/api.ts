import { ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../shared/ipcChannels'
import type {
  AsrResultEvent,
  AsrStatusInfo,
  ImportResult,
  PlaybackCommand,
  PlaybackState,
  ResizeEdge,
  Script,
  SelfTestResult,
  SettingsPatch,
  TeleprompterSettings,
} from '../shared/types'

export interface SyncState {
  settings: TeleprompterSettings
  playback: PlaybackState
  script: Script | null
  asr: AsrStatusInfo
}

type Unsubscribe = () => void

function subscribe<T>(channel: string, callback: (payload: T) => void): Unsubscribe {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

/** Surface shared by both windows. */
const coreApi = {
  platform: process.platform,

  app: {
    getLocale: (): Promise<string> => ipcRenderer.invoke(IPC.AppGetLocale),
    /** Opens System Settings > Privacy > Microphone (macOS only). */
    openMicSettings: (): void => ipcRenderer.send(IPC.AppOpenMicSettings),
  },

  settings: {
    get: (): Promise<TeleprompterSettings> => ipcRenderer.invoke(IPC.SettingsGet),
    patch: (patch: SettingsPatch): void =>
      ipcRenderer.send(IPC.SettingsPatch, patch),
    onChange: (callback: (settings: TeleprompterSettings) => void): Unsubscribe =>
      subscribe(IPC.SettingsChanged, callback),
  },

  playback: {
    command: (command: PlaybackCommand): void => ipcRenderer.send(IPC.PlaybackCommand, command),
    onState: (callback: (state: PlaybackState) => void): Unsubscribe =>
      subscribe(IPC.PlaybackState, callback),
  },

  asrStatus: {
    get: (): Promise<AsrStatusInfo> => ipcRenderer.invoke(IPC.AsrStatus),
    onStatus: (callback: (status: AsrStatusInfo) => void): Unsubscribe =>
      subscribe(IPC.AsrStatus, callback),
  },

  currentScript: {
    onChange: (callback: (script: Script) => void): Unsubscribe =>
      subscribe(IPC.CurrentScript, callback),
  },

  /** One-call bootstrap: current settings + playback + active script. */
  syncState: (): Promise<SyncState> => ipcRenderer.invoke(IPC.StateSync),
}

/** Editor window: script management, self-test runner, model management. */
export const editorApi = {
  ...coreApi,
  scripts: {
    list: (): Promise<Script[]> => ipcRenderer.invoke(IPC.ScriptsList),
    get: (id: string): Promise<Script | null> => ipcRenderer.invoke(IPC.ScriptsGet, id),
    create: (input?: Partial<Pick<Script, 'title' | 'content'>>): Promise<Script> =>
      ipcRenderer.invoke(IPC.ScriptsCreate, input),
    update: (
      id: string,
      patch: Partial<Pick<Script, 'title' | 'content'>>,
    ): Promise<Script | null> => ipcRenderer.invoke(IPC.ScriptsUpdate, id, patch),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.ScriptsDelete, id),
    /** Opens a file picker and imports markdown/txt files as scripts. */
    import: (): Promise<ImportResult> => ipcRenderer.invoke(IPC.ScriptsImport),
  },
  selftest: {
    run: (): Promise<SelfTestResult> => ipcRenderer.invoke(IPC.SelfTestRun),
  },
  asr: {
    control: (command: { type: 'start' | 'stop' }): void =>
      ipcRenderer.send(IPC.AsrControl, command),
    downloadModel: (): Promise<boolean> => ipcRenderer.invoke(IPC.AsrDownloadModel),
  },
}

/** Teleprompter overlay window: live script, resize, mic feed, ASR results. */
export const teleprompterApi = {
  ...coreApi,
  windowControls: {
    resize: (edge: ResizeEdge, dx: number, dy: number): void =>
      ipcRenderer.send(IPC.WindowResize, edge, dx, dy),
  },
  selftest: {
    onPrepare: (callback: () => void): Unsubscribe => subscribe(IPC.SelfTestPrepare, callback),
    onDone: (callback: () => void): Unsubscribe => subscribe(IPC.SelfTestDone, callback),
  },
  asr: {
    feedPcm: (buffer: ArrayBuffer): void => ipcRenderer.send(IPC.AsrPcm, buffer),
    onResult: (callback: (result: AsrResultEvent) => void): Unsubscribe =>
      subscribe(IPC.AsrResult, callback),
  },
}

export type EditorApi = typeof editorApi
export type TeleprompterApi = typeof teleprompterApi
/** Union used for renderer typing; at runtime each window gets its own subset. */
export type WindowApi = EditorApi & TeleprompterApi
