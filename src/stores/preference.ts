import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { defaultLocale, i18n, messages, type LocaleKey } from '@/i18n'

const STORAGE_KEY = 'web-tools:preferences'

interface PreferenceState {
  locale: LocaleKey
}

function isLocaleKey(value: unknown): value is LocaleKey {
  return typeof value === 'string' && value in messages
}

function readPreferences(): PreferenceState {
  const fallback: PreferenceState = {
    locale: defaultLocale,
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback

    const parsed = JSON.parse(stored) as Partial<PreferenceState>
    return {
      locale: isLocaleKey(parsed.locale) ? parsed.locale : fallback.locale,
    }
  } catch {
    return fallback
  }
}

export const usePreferenceStore = defineStore('preference', () => {
  const initial = readPreferences()
  const locale = ref<LocaleKey>(initial.locale)

  function applyLocale(value = locale.value) {
    i18n.global.locale.value = value
    document.documentElement.lang = value === 'zh-CN' ? 'zh-CN' : 'en'
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        locale: locale.value,
      } satisfies PreferenceState),
    )
  }

  function setLocale(value: LocaleKey) {
    locale.value = value
  }

  applyLocale()

  watch(locale, (value) => {
    applyLocale(value)
    persist()
  })

  return { locale, setLocale }
})
