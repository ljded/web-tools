<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import gbk from 'gbk.js'

const MAX_ENCODING_CHARS = 500_000

const mode = ref<'to' | 'from'>('to')
const results = ref<{ name: string; value: string }[]>([])
const notice = ref('')

const { input, history, saveHistory } = useToolState<string, { mode: 'to' | 'from'; input: string }>({
  storageKey: 'encoding',
  defaultInput: '你好，世界！Hello 🌍',
  historyOptions: {
    maxCount: 15,
    generateLabel: (d) => `[${d.mode === 'to' ? '编码' : '解码'}] ${d.input.slice(0, 40)}${d.input.length > 40 ? '...' : ''}`,
  },
})

function onHistorySelect(item: { data: { mode: 'to' | 'from'; input: string } }) {
  mode.value = item.data.mode
  input.value = item.data.input
}

function updateResults() {
  const txt = input.value
  if (!txt) { results.value = []; notice.value = ''; return }
  if (txt.length > MAX_ENCODING_CHARS) {
    results.value = []
    notice.value = `输入过长，已暂停实时编码转换。请控制在 ${MAX_ENCODING_CHARS.toLocaleString()} 字符以内。`
    return
  }
  notice.value = ''

  if (mode.value === 'to') {
    const utf8Bytes = new TextEncoder().encode(txt)
    results.value = [
      { name: 'Unicode 码点', value: [...txt].map(c => 'U+' + c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')).join(' ') },
      { name: 'UTF-8 (Hex)', value: Array.from(utf8Bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { name: 'UTF-8 (Decimal)', value: Array.from(utf8Bytes).join(' ') },
      { name: 'UTF-16 (Hex)', value: getUtf16Hex(txt) },
      { name: 'GBK (Hex)', value: gbk.encode(txt).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { name: 'GBK URI Encode', value: gbk.URI.encodeURIComponent(txt) },
      { name: 'Base64', value: btoa(unescape(encodeURIComponent(txt))) },
      { name: 'URL Encode', value: encodeURIComponent(txt) },
      { name: 'HTML Entity (Decimal)', value: [...txt].map(c => '&#x' + c.codePointAt(0)?.toString(16) + ';').join('') },
      { name: 'Escape', value: escape(txt) },
    ]
    return
  }

  const decoded: { name: string; value: string }[] = []
  try {
    const unicode = txt.replace(/U\+/gi, '').split(/\s+/).filter(Boolean).map(s => String.fromCodePoint(parseInt(s, 16))).join('')
    decoded.push({ name: 'Unicode 码点解码', value: unicode })
  } catch { /* ignore */ }
  try {
    const hex = txt.replace(/\s+/g, '')
    if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
      decoded.push({ name: 'Hex → UTF-8', value: new TextDecoder().decode(bytes) })
    }
  } catch { /* ignore */ }
  try {
    const hex = txt.replace(/\s+/g, '')
    if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
      const bytes = hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
      decoded.push({ name: 'Hex → GBK', value: gbk.decode(bytes) })
    }
  } catch { /* ignore */ }
  try { decoded.push({ name: 'GBK URI 解码', value: gbk.URI.decodeURIComponent(txt) }) } catch { /* ignore */ }
  try { decoded.push({ name: 'Base64 解码', value: decodeURIComponent(escape(atob(txt))) }) } catch { /* ignore */ }
  try { decoded.push({ name: 'URL 解码', value: decodeURIComponent(txt) }) } catch { /* ignore */ }
  try {
    const div = document.createElement('div')
    div.innerHTML = txt
    decoded.push({ name: 'HTML Entity 解码', value: div.textContent || '' })
  } catch { /* ignore */ }
  try { decoded.push({ name: 'Escape 解码', value: unescape(txt) }) } catch { /* ignore */ }

  results.value = decoded.length ? decoded : [{ name: '提示', value: '未能识别编码格式，请尝试其他输入' }]
}

let updateTimer: ReturnType<typeof setTimeout> | null = null
watch([input, mode], () => {
  if (updateTimer) clearTimeout(updateTimer)
  updateTimer = setTimeout(updateResults, 180)
}, { immediate: true })

function getUtf16Hex(txt: string): string {
  const out: string[] = []
  for (let i = 0; i < txt.length; i++) {
    out.push(txt.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'))
  }
  return out.join(' ')
}
</script>

<template>
  <ToolPage name="encoding" max-width="3xl" icon="i-lucide-languages">
    <ToolSection title="输入" description="选择转换方向后输入文本或编码内容。">
      <template #actions>
        <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
      </template>
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UTabs v-model="mode" :items="[{ label: '字符 → 编码', value: 'to' }, { label: '编码 → 字符', value: 'from' }]" color="info" />
        </div>
      </div>
      <UTextarea
        v-model="input"
        @blur="saveHistory"
        :placeholder="mode === 'to' ? '输入要编码的文本...' : '输入编码内容（如 Base64、Hex、URL Encode 等）'"
        :rows="8"
        class="w-full"
      />
      <UAlert v-if="notice" class="mt-3" color="warning" variant="soft" icon="i-lucide-triangle-alert" :description="notice" />
    </ToolSection>

    <div class="space-y-3">
      <ResultPanel v-for="item in results" :key="item.name" :title="item.name" :value="item.value" />
    </div>
  </ToolPage>
</template>
