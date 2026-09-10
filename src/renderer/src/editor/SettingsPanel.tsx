import { AudioLines, Download, Settings2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AsrStatusInfo, SelfTestResult, TeleprompterSettings } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import { ColorField, Section, SelectField, ShortcutField, SliderField, SwitchField } from './controls'

export function SettingsPanel(props: {
  settings: TeleprompterSettings
  onPatch: (patch: Partial<TeleprompterSettings>) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const { settings, onPatch } = props
  const asr = useAppStore((s) => s.asr)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<SelfTestResult | null>(null)

  const runSelfTest = async (): Promise<void> => {
    setTesting(true)
    try {
      setTestResult(await window.tp.selftest.run())
    } finally {
      setTesting(false)
    }
  }

  const selfTestMessage = (result: SelfTestResult): string => {
    if (result.detail.startsWith('error:')) {
      return t('selftest.result.error', { message: result.detail.slice('error:'.length) })
    }
    return t(`selftest.result.${result.detail}`)
  }

  const asrMessage = (status: AsrStatusInfo): string => {
    if (status.state === 'error' && status.error === 'mic-denied') {
      return t('asr.state.mic-denied')
    }
    if (status.state === 'error' && status.error?.startsWith('engine:')) {
      return t('asr.error', { message: status.error.slice('engine:'.length) })
    }
    if (status.state === 'error' && status.error?.startsWith('download:')) {
      return t('asr.downloadFailed', { message: status.error.slice('download:'.length) })
    }
    return t(`asr.state.${status.state}`)
  }

  return (
    <aside className="w-72 shrink-0 space-y-6 overflow-y-auto border-l border-zinc-800/80 bg-zinc-950 px-4 py-4">
      <h2 className="text-sm font-semibold text-zinc-200">{t('settings.title')}</h2>

      <Section title={t('settings.appearance')}>
        <SliderField
          label={t('settings.fontSize')}
          value={settings.fontSize}
          min={24}
          max={120}
          step={1}
          format={(v) => `${v}px`}
          onChange={(v) => onPatch({ fontSize: v })}
        />
        <SliderField
          label={t('playback.speed')}
          value={settings.speed}
          min={10}
          max={600}
          step={5}
          format={(v) => `${v} px/s`}
          onChange={(v) => onPatch({ speed: v })}
        />
        <SliderField
          label={t('settings.lineHeight')}
          value={settings.lineHeight}
          min={1}
          max={2.5}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => onPatch({ lineHeight: v })}
        />
        <SliderField
          label={t('settings.letterSpacing')}
          value={settings.letterSpacing}
          min={0}
          max={12}
          step={0.5}
          format={(v) => `${v}px`}
          onChange={(v) => onPatch({ letterSpacing: v })}
        />
        <ColorField
          label={t('settings.textColor')}
          value={settings.textColor}
          onChange={(v) => onPatch({ textColor: v })}
        />
        <ColorField
          label={t('settings.backgroundColor')}
          value={settings.backgroundColor}
          onChange={(v) => onPatch({ backgroundColor: v })}
        />
        <SliderField
          label={t('settings.backgroundOpacity')}
          value={settings.backgroundOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onPatch({ backgroundOpacity: v })}
        />
        <SelectField
          label={t('settings.textAlign')}
          value={settings.textAlign}
          options={[
            { value: 'left', label: t('settings.alignLeft') },
            { value: 'center', label: t('settings.alignCenter') },
          ]}
          onChange={(v) => onPatch({ textAlign: v as TeleprompterSettings['textAlign'] })}
        />
      </Section>

      <Section title={t('settings.followSection')}>
        <SwitchField
          label={t('settings.followMode')}
          hint={t('settings.followHint')}
          checked={settings.followMode}
          onChange={(v) => onPatch({ followMode: v })}
        />
        {settings.followMode && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <AudioLines size={12} />
                {t('asr.title')}
              </span>
              {(asr.state === 'no-model' || (asr.state === 'error' && asr.error?.startsWith('download:'))) && (
                <button
                  type="button"
                  onClick={() => void window.tp.asr.downloadModel()}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 hover:border-lime-400/60 hover:text-lime-300"
                >
                  <Download size={12} />
                  {t('asr.download')}
                </button>
              )}
              {asr.state === 'error' && asr.error === 'mic-denied' && window.tp.platform === 'darwin' && (
                <button
                  type="button"
                  onClick={() => window.tp.app.openMicSettings()}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 hover:border-lime-400/60 hover:text-lime-300"
                >
                  <Settings2 size={12} />
                  {t('asr.openMicSettings')}
                </button>
              )}
            </div>
            {asr.state === 'downloading' && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-lime-400 transition-all"
                    style={{ width: `${Math.round((asr.progress ?? 0) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] tabular-nums text-zinc-500">
                  {t('asr.downloading', { percent: Math.round((asr.progress ?? 0) * 100) })}
                </p>
              </div>
            )}
            {asr.state !== 'downloading' && asr.state !== 'idle' && (
              <p
                className={`mt-1.5 text-[11px] leading-snug ${
                  asr.state === 'ready' ? 'text-lime-300' : asr.state === 'error' ? 'text-amber-300' : 'text-zinc-500'
                }`}
              >
                {asrMessage(asr)}
              </p>
            )}
            {asr.state === 'idle' && (
              <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{t('asr.idleHint')}</p>
            )}
          </div>
        )}
      </Section>

      <Section title={t('settings.behavior')}>
        <SwitchField
          label={t('settings.stealth')}
          hint={t('settings.stealthHint')}
          checked={settings.stealth}
          onChange={(v) => onPatch({ stealth: v })}
        />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400">{t('selftest.title')}</span>
            <button
              type="button"
              disabled={testing}
              onClick={() => void runSelfTest()}
              className="flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 hover:border-lime-400/60 hover:text-lime-300 disabled:opacity-50"
            >
              <ShieldCheck size={12} />
              {testing ? t('selftest.running') : t('selftest.run')}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{t('selftest.hint')}</p>
          {testResult && (
            <p
              className={`mt-2 rounded px-2 py-1.5 text-[11px] leading-snug ${
                testResult.invisible === true
                  ? 'bg-lime-400/10 text-lime-300'
                  : testResult.invisible === false
                    ? 'bg-amber-400/10 text-amber-300'
                    : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {selfTestMessage(testResult)}
            </p>
          )}
        </div>
        <SwitchField
          label={t('settings.clickThrough')}
          hint={t('settings.clickThroughHint')}
          checked={settings.clickThrough}
          onChange={(v) => onPatch({ clickThrough: v })}
        />
        <SwitchField
          label={t('settings.alwaysOnTop')}
          checked={settings.alwaysOnTop}
          onChange={(v) => onPatch({ alwaysOnTop: v })}
        />
        <SwitchField
          label={t('settings.mirrorH')}
          checked={settings.mirrorHorizontal}
          onChange={(v) => onPatch({ mirrorHorizontal: v })}
        />
        <SwitchField
          label={t('settings.mirrorV')}
          hint={t('settings.mirrorHint')}
          checked={settings.mirrorVertical}
          onChange={(v) => onPatch({ mirrorVertical: v })}
        />
        <SelectField
          label={t('settings.language')}
          value={settings.language}
          options={[
            { value: 'auto', label: t('settings.langAuto') },
            { value: 'zh-CN', label: '简体中文' },
            { value: 'en-US', label: 'English' },
          ]}
          onChange={(v) => onPatch({ language: v as TeleprompterSettings['language'] })}
        />
      </Section>

      <Section title={t('settings.shortcuts')}>
        <ShortcutField
          label={t('settings.shortcutToggle')}
          value={settings.shortcuts.togglePlay}
          onChange={(v) => onPatch({ shortcuts: { ...settings.shortcuts, togglePlay: v } })}
        />
        <ShortcutField
          label={t('settings.shortcutSpeedUp')}
          value={settings.shortcuts.speedUp}
          onChange={(v) => onPatch({ shortcuts: { ...settings.shortcuts, speedUp: v } })}
        />
        <ShortcutField
          label={t('settings.shortcutSpeedDown')}
          value={settings.shortcuts.speedDown}
          onChange={(v) => onPatch({ shortcuts: { ...settings.shortcuts, speedDown: v } })}
        />
        <ShortcutField
          label={t('settings.shortcutReset')}
          value={settings.shortcuts.reset}
          onChange={(v) => onPatch({ shortcuts: { ...settings.shortcuts, reset: v } })}
        />
        <p className="text-[11px] leading-snug text-zinc-600">{t('settings.shortcutHint')}</p>
      </Section>
    </aside>
  )
}
