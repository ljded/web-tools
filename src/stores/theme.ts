import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

type ThemeMode = 'light' | 'dark' | 'auto'

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDark(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem('theme-mode') as ThemeMode) || 'auto')
  const isDark = ref(mode.value === 'auto' ? getSystemDark() : mode.value === 'dark')

  applyDark(isDark.value)

  function update() {
    if (mode.value === 'auto') {
      isDark.value = getSystemDark()
    } else {
      isDark.value = mode.value === 'dark'
    }
    applyDark(isDark.value)
  }

  watch(mode, (val) => {
    localStorage.setItem('theme-mode', val)
    update()
  })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode.value === 'auto') update()
  })

  return { mode, isDark, update }
})
