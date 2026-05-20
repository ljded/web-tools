<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import gbk from 'gbk.js'

const input = ref('你好，世界！Hello 🌍')
const mode = ref<'to' | 'from'>('to')

const results = computed(() => {
  const text = input.value
  if (!text) return []

  if (mode.value === 'to') {
    // 字符 → 编码
    const utf8Bytes = new TextEncoder().encode(text)
    return [
      { name: 'Unicode 码点', value: [...text].map((c) => 'U+' + c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')).join(' ') },
      { name: 'UTF-8 (Hex)', value: Array.from(utf8Bytes).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { name: 'UTF-8 (Decimal)', value: Array.from(utf8Bytes).join(' ') },
      { name: 'UTF-16 (Hex)', value: getUtf16Hex(text) },
      { name: 'GBK (Hex)', value: gbk.encode(text).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') },
      { name: 'GBK URI Encode', value: gbk.URI.encodeURIComponent(text) },
      { name: 'Base64', value: btoa(unescape(encodeURIComponent(text))) },
      { name: 'URL Encode', value: encodeURIComponent(text) },
      { name: 'HTML Entity (Decimal)', value: [...text].map((c) => '&#x' + c.codePointAt(0)?.toString(16) + ';').join('') },
      { name: 'Escape', value: escape(text) },
    ]
  } else {
    // 编码 → 字符 (尝试多种解码)
    const decoded: { name: string; value: string; error?: string }[] = []
    // Unicode 码点 U+0041 U+0042
    try {
      const unicode = text.replace(/U\+/gi, '').split(/\s+/).filter(Boolean).map((s) => String.fromCodePoint(parseInt(s, 16))).join('')
      decoded.push({ name: 'Unicode 码点解码', value: unicode })
    } catch { /* ignore */ }
    // Hex UTF-8
    try {
      const hex = text.replace(/\s+/g, '')
      if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
        const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
        decoded.push({ name: 'Hex → UTF-8', value: new TextDecoder().decode(bytes) })
      }
    } catch { /* ignore */ }
    // Hex GBK
    try {
      const hex = text.replace(/\s+/g, '')
      if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
        const bytes = hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
        decoded.push({ name: 'Hex → GBK', value: gbk.decode(bytes) })
      }
    } catch { /* ignore */ }
    // GBK URI Decode
    try {
      decoded.push({ name: 'GBK URI 解码', value: gbk.URI.decodeURIComponent(text) })
    } catch { /* ignore */ }
    // Base64
    try {
      decoded.push({ name: 'Base64 解码', value: decodeURIComponent(escape(atob(text))) })
    } catch { /* ignore */ }
    // URL Decode
    try {
      decoded.push({ name: 'URL 解码', value: decodeURIComponent(text) })
    } catch { /* ignore */ }
    // HTML Entity
    try {
      const div = document.createElement('div')
      div.innerHTML = text
      decoded.push({ name: 'HTML Entity 解码', value: div.textContent || '' })
    } catch { /* ignore */ }
    // Escape
    try {
      decoded.push({ name: 'Escape 解码', value: unescape(text) })
    } catch { /* ignore */ }
    return decoded.length ? decoded : [{ name: '提示', value: '未能识别编码格式，请尝试其他输入' }]
  }
})

function getUtf16Hex(text: string): string {
  const out: string[] = []
  for (let i = 0; i < text.length; i++) {
    out.push(text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'))
  }
  return out.join(' ')
}

async function copy(val: string, key: string) {
  const ok = await copyToClipboard(val)
  if (!ok) return
  copiedMap.value[key] = true
  setTimeout(() => delete copiedMap.value[key], 1500)
}
const copiedMap = ref<Record<string, boolean>>({})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <div class="mb-4 flex items-center gap-3">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button
            @click="mode = 'to'"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'to' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'"
          >
            字符 → 编码
          </button>
          <button
            @click="mode = 'from'"
            class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'from' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'"
          >
            编码 → 字符
          </button>
        </div>
      </div>
      <textarea
        v-model="input"
        :placeholder="mode === 'to' ? '输入要编码的文本...' : '输入编码内容（如 Base64、Hex、URL Encode 等）'"
        class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-4 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>

    <div class="space-y-3">
      <div
        v-for="item in results"
        :key="item.name"
        class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium text-on-surface-variant">{{ item.name }}</span>
          <button
            @click="copy(item.value, item.name)"
            class="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary-container transition-colors"
          >
            <Check v-if="copiedMap[item.name]" class="h-3.5 w-3.5" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copiedMap[item.name] ? '已复制' : '复制' }}
          </button>
        </div>
        <div class="break-all rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface">
          {{ item.value }}
        </div>
      </div>
    </div>
  </div>
</template>
