<script setup lang="ts">
import { computed } from 'vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { usePersistedRef } from '@/utils/persist'
import { useRouteQueryValue } from '@/utils/routeQuery'

const mode = usePersistedRef<'encode' | 'decode'>('web-tools:morse:mode', 'encode')
useRouteQueryValue('mode', mode, ['encode', 'decode'])
const input = usePersistedRef('web-tools:morse:input', 'HELLO WORLD')

const map: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.',
  '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
}

const reverseMap = Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]))

const output = computed(() => {
  const value = input.value.trim()
  if (!value) return ''

  if (mode.value === 'encode') {
    return value
      .toUpperCase()
      .split('')
      .map((char) => {
        if (char === ' ') return '/'
        return map[char] ?? '?'
      })
      .join(' ')
  }

  return value
    .split(/\s+/)
    .map((token) => {
      if (token === '/') return ' '
      return reverseMap[token] ?? '?'
    })
    .join('')
})
</script>

<template>
  <ToolPage name="morse" max-width="6xl" icon="i-lucide-radio-tower">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.morse.inputTitle')" :description="$t('tools.morse.inputDesc')">
        <div class="space-y-4">
          <UTabs
            v-model="mode"
            :items="[
              { label: $t('tools.morse.encode'), value: 'encode' },
              { label: $t('tools.morse.decode'), value: 'decode' },
            ]"
          />
          <UTextarea v-model="input" :rows="8" class="w-full" :placeholder="mode === 'encode' ? $t('tools.morse.encodePlaceholder') : $t('tools.morse.decodePlaceholder')" />
          <ResultPanel class="lg:hidden" :title="$t('tools.morse.resultTitle')" :value="output" pre-wrap compact />
        </div>
      </ToolSection>

      <div class="hidden lg:block tool-preview-sticky">
        <ResultPanel :title="$t('tools.morse.resultTitle')" :value="output" pre-wrap max-height="360px" />
      </div>
    </div>
  </ToolPage>
</template>
