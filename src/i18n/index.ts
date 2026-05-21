import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export type LocaleKey = keyof typeof messages

export const defaultLocale: LocaleKey = 'zh-CN'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en-US',
  messages,
})
