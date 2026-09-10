import i18n from './i18n/instance'
import { applyLanguage, initI18n } from './i18n'
import { useAppStore } from './stores/appStore'

/**
 * Shared bootstrap for both renderer windows. Subscriptions are installed
 * BEFORE requesting the sync snapshot so no broadcast can slip through the
 * gap between "get state" and "start listening".
 */
export async function bootstrap(): Promise<void> {
  window.tp.settings.onChange((settings) => {
    useAppStore.setState({ settings })
    void applyLanguage(settings.language).then(() => {
      document.documentElement.lang = i18n.language
    })
  })
  window.tp.playback.onState((playback) => {
    useAppStore.setState({ playback })
  })
  window.tp.currentScript.onChange((script) => {
    useAppStore.setState({ script })
  })
  window.tp.asrStatus.onStatus((asr) => {
    useAppStore.setState({ asr })
  })

  const sync = await window.tp.syncState()
  useAppStore.setState({
    settings: sync.settings,
    playback: sync.playback,
    script: sync.script,
    asr: sync.asr,
  })

  await initI18n(sync.settings.language)
  document.documentElement.lang = i18n.language
}
