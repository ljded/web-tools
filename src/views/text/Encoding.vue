<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { useRouteQueryValue } from '@/utils/routeQuery'

const MAX_ENCODING_CHARS = 500_000

const { t } = useI18n()

const mode = ref<'to' | 'from'>('to')
useRouteQueryValue('mode', mode, ['to', 'from'])
const results = ref<{ name: string; value: string }[]>([])
const notice = ref('')

const { input, history, saveHistory } = useToolState<string, { mode: 'to' | 'from'; input: string }>({
  storageKey: 'encoding',
  defaultInput: t('tools.encoding.sampleText'),
  getHistoryData: (value) => ({ mode: mode.value, input: value }),
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => `[${d.mode === 'to' ? t('tools.encoding.historyEncode') : t('tools.encoding.historyDecode')}] ${d.input.slice(0, 40)}${d.input.length > 40 ? '...' : ''}`,
  },
})

function onHistorySelect(item: { data: { mode: 'to' | 'from'; input: string } }) {
  mode.value = item.data.mode
  input.value = item.data.input
}

let updateSeq = 0

async function updateResults() {
  const seq = ++updateSeq
  const txt = input.value
  if (!txt) { results.value = []; notice.value = ''; return }
  if (txt.length > MAX_ENCODING_CHARS) {
    results.value = []
    notice.value = t('tools.encoding.inputTooLong', { max: MAX_ENCODING_CHARS.toLocaleString() })
    return
  }
  notice.value = ''

  const { default: gbk } = await import('gbk.js')
  if (seq !== updateSeq) return

  if (mode.value === 'to') {
    const utf8Bytes = new TextEncoder().encode(txt)
    results.value = [
      { name: t('tools.encoding.results.unicode'), value: [...txt].map(c => 'U+' + c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')).join(' ') },
      { name: t('tools.encoding.results.utf8Hex'), value: Array.from(utf8Bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { name: t('tools.encoding.results.utf8Dec'), value: Array.from(utf8Bytes).join(' ') },
      { name: t('tools.encoding.results.utf16Hex'), value: getUtf16Hex(txt) },
      { name: t('tools.encoding.results.gbkHex'), value: gbk.encode(txt).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { name: t('tools.encoding.results.gbkUri'), value: gbk.URI.encodeURIComponent(txt) },
      { name: t('tools.encoding.results.base64'), value: btoa(unescape(encodeURIComponent(txt))) },
      { name: t('tools.encoding.results.urlEncode'), value: encodeURIComponent(txt) },
      { name: t('tools.encoding.results.htmlEntity'), value: [...txt].map(c => '&#x' + c.codePointAt(0)?.toString(16) + ';').join('') },
      { name: t('tools.encoding.results.escape'), value: escape(txt) },
    ]
    return
  }

  const decoded: { name: string; value: string }[] = []
  try {
    const unicode = txt.replace(/U\+/gi, '').split(/\s+/).filter(Boolean).map(s => String.fromCodePoint(parseInt(s, 16))).join('')
    decoded.push({ name: t('tools.encoding.results.unicodeDecode'), value: unicode })
  } catch { /* ignore */ }
  try {
    const hex = txt.replace(/\s+/g, '')
    if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
      decoded.push({ name: t('tools.encoding.results.hexToUtf8'), value: new TextDecoder().decode(bytes) })
    }
  } catch { /* ignore */ }
  try {
    const hex = txt.replace(/\s+/g, '')
    if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
      const bytes = hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
      decoded.push({ name: t('tools.encoding.results.hexToGbk'), value: gbk.decode(bytes) })
    }
  } catch { /* ignore */ }
  try { decoded.push({ name: t('tools.encoding.results.gbkUriDecode'), value: gbk.URI.decodeURIComponent(txt) }) } catch { /* ignore */ }
  try { decoded.push({ name: t('tools.encoding.results.base64Decode'), value: decodeURIComponent(escape(atob(txt))) }) } catch { /* ignore */ }
  try { decoded.push({ name: t('tools.encoding.results.urlDecode'), value: decodeURIComponent(txt) }) } catch { /* ignore */ }
  try {
    const div = document.createElement('div')
    div.innerHTML = txt
    decoded.push({ name: t('tools.encoding.results.htmlEntityDecode'), value: div.textContent || '' })
  } catch { /* ignore */ }
  try { decoded.push({ name: t('tools.encoding.results.escapeDecode'), value: unescape(txt) }) } catch { /* ignore */ }

  if (seq === updateSeq) {
    results.value = decoded.length ? decoded : [{ name: t('tools.encoding.tip'), value: t('tools.encoding.noMatch') }]
  }
}

let updateTimer: ReturnType<typeof setTimeout> | null = null
watch([input, mode], () => {
  if (updateTimer) clearTimeout(updateTimer)
  updateTimer = setTimeout(() => { void updateResults() }, 180)
}, { immediate: true })

function getUtf16Hex(txt: string): string {
  const out: string[] = []
  for (let i = 0; i < txt.length; i++) {
    out.push(txt.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'))
  }
  return out.join(' ')
}

const primaryResult = computed(() => results.value[0])
const modeItems = computed(() => [
  { label: t('tools.encoding.charToEncode'), value: 'to' },
  { label: t('tools.encoding.encodeToChar'), value: 'from' },
])
</script>

<template>
  <ToolPage name="encoding" max-width="6xl" icon="i-lucide-languages">
    <div class="tool-workspace">
      <ToolSection :title="$t('tools.encoding.inputTitle')" :description="$t('tools.encoding.inputDesc')">
      <template #actions>
        <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
      </template>
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UTabs v-model="mode" :items="modeItems" color="info" />
        </div>
      </div>
      <UTextarea
        v-model="input"
        @blur="saveHistory"
        :placeholder="mode === 'to' ? $t('tools.encoding.inputPlaceholder') : $t('tools.encoding.decodePlaceholder')"
        :rows="8"
        class="w-full"
      />
        <UAlert v-if="notice" class="mt-3" color="warning" variant="soft" icon="i-lucide-triangle-alert" :description="notice" />
        <ResultPanel
          v-if="primaryResult"
          class="mt-4 lg:hidden"
          :title="primaryResult.name"
          :value="primaryResult.value"
          max-height="220px"
          compact
        />
      </ToolSection>

      <div class="hidden space-y-3 lg:block tool-preview-sticky">
        <ResultPanel
          v-for="item in results"
          :key="item.name"
          :title="item.name"
          :value="item.value"
          max-height="180px"
          compact
        />
        <ResultPanel v-if="!results.length" :title="$t('tools.encoding.resultTitle')" value="" :empty-text="$t('app.waitingForInput')" />
      </div>
    </div>
  </ToolPage>
</template>
