import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
} as const

export type LocaleKey = keyof typeof messages

/**
 * 所有可用的 i18n 键，基于 zh-CN 语言包的类型推导。
 *
 * 使用方式：
 * ```ts
 * const { t } = useI18n<{ message: I18nSchema }>()
 * ```
 *
 * 或者直接用 vue-i18n v11+ 的内置类型推断。
 */
export type I18nSchema = typeof zhCN

export const defaultLocale: LocaleKey = 'zh-CN'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en-US',
  messages,
})
