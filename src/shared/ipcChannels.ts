/**
 * Single source of truth for IPC channel names shared by main, preload and
 * both renderer windows. Payload types live in ./types.ts and are wired to
 * these channels in src/preload/api.ts.
 */
export const IPC = {
  // scripts (invoke: editor -> main)
  ScriptsList: 'scripts:list',
  ScriptsGet: 'scripts:get',
  ScriptsCreate: 'scripts:create',
  ScriptsUpdate: 'scripts:update',
  ScriptsDelete: 'scripts:delete',
  ScriptsImport: 'scripts:import',

  // settings
  SettingsGet: 'settings:get',
  SettingsPatch: 'settings:patch',
  SettingsChanged: 'state:settings',

  // playback
  PlaybackCommand: 'playback:command',
  PlaybackState: 'state:playback',
  CurrentScript: 'state:script',

  // teleprompter window geometry (renderer edge-drag resize)
  WindowResize: 'window:resize',

  // one-call bootstrap for renderer windows
  StateSync: 'state:sync',

  // stealth self-test
  SelfTestRun: 'selftest:run',
  SelfTestPrepare: 'selftest:prepare',
  SelfTestDone: 'selftest:done',

  // speech following (M2)
  AsrControl: 'asr:control',
  AsrPcm: 'asr:pcm',
  AsrResult: 'asr:result',
  AsrStatus: 'asr:status',
  AsrDownloadModel: 'asr:download-model',

  // app meta
  AppGetLocale: 'app:get-locale',
  AppOpenMicSettings: 'app:open-mic-settings',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
