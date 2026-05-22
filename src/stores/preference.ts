import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { defaultLocale, i18n, messages, type LocaleKey } from '@/i18n'

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'web-tools:preferences'

interface PreferenceState {
  locale: LocaleKey
  themeMode: ThemeMode
}

function isLocaleKey(value: unknown): value is LocaleKey {
  return typeof value === 'string' && value in messages
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'auto'
}

function getSystemDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readPreferences(): PreferenceState {
  const fallback: PreferenceState = {
    locale: defaultLocale,
    themeMode: 'auto',
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PreferenceState>
      return {
        locale: isLocaleKey(parsed.locale) ? parsed.locale : fallback.locale,
        themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : fallback.themeMode,
      }
    }
  } catch {
    // Ignore broken persisted data and fall back to safe defaults.
  }

  return fallback
}

export const usePreferenceStore = defineStore('preference', () => {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const initial = readPreferences()
  const locale = ref<LocaleKey>(initial.locale)
  const themeMode = ref<ThemeMode>(initial.themeMode)
  const systemDark = ref(getSystemDark())
  const isDark = computed(
    () => (themeMode.value === 'auto' ? systemDark.value : themeMode.value === 'dark'),
  )

  function applyLocale(value = locale.value) {
    i18n.global.locale.value = value
    document.documentElement.lang = value === 'zh-CN' ? 'zh-CN' : 'en'
  }

  function applyTheme() {
    // Tailwind v4 .dark class 控制 utility 变体
    document.documentElement.classList.toggle('dark', isDark.value)
    // color-scheme CSS 属性驱动 light-dark() 函数
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  }

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        locale: locale.value,
        themeMode: themeMode.value,
      } satisfies PreferenceState),
    )
  }

  function setLocale(value: LocaleKey) {
    locale.value = value
  }

  function setThemeMode(value: ThemeMode) {
    themeMode.value = value
  }

  function updateSystemTheme() {
    systemDark.value = getSystemDark()
    applyTheme()
  }

  applyLocale()
  applyTheme()

  watch(locale, (value) => {
    applyLocale(value)
    persist()
  })

  watch(themeMode, () => {
    applyTheme()
    persist()
  })

  watch(isDark, applyTheme)

  media.addEventListener('change', updateSystemTheme)

  return { locale, themeMode, isDark, setLocale, setThemeMode, updateSystemTheme }
})
