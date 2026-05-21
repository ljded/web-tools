import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { i18n, messages, type LocaleKey, defaultLocale } from '@/i18n'

const STORAGE_KEY = 'web-tools:locale'

export const useLocaleStore = defineStore('locale', () => {
  const savedLocale = localStorage.getItem(STORAGE_KEY)
  const locale = ref<LocaleKey>(isLocaleKey(savedLocale) ? savedLocale : defaultLocale)

  function setLocale(val: LocaleKey) {
    locale.value = val
  }

  watch(locale, (val) => {
    localStorage.setItem(STORAGE_KEY, val)
    i18n.global.locale.value = val
    document.documentElement.lang = val === 'zh-CN' ? 'zh-CN' : 'en'
  })

  // Initialize
  i18n.global.locale.value = locale.value
  document.documentElement.lang = locale.value === 'zh-CN' ? 'zh-CN' : 'en'

  return { locale, setLocale }
})

function isLocaleKey(val: string | null): val is LocaleKey {
  return !!val && val in messages
}
