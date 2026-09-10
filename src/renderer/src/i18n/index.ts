import { initReactI18next } from 'react-i18next'
import type { LanguageSetting, ResolvedLanguage } from '../../../shared/types'
import i18n from './instance'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

async function resolveLanguage(language: LanguageSetting): Promise<ResolvedLanguage> {
  if (language !== 'auto') return language
  const locale = await window.tp.app.getLocale()
  return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export async function initI18n(language: LanguageSetting): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: await resolveLanguage(language),
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  })
}

export async function applyLanguage(language: LanguageSetting): Promise<void> {
  await i18n.changeLanguage(await resolveLanguage(language))
}
