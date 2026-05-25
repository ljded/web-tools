<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

const rgb = ref({ r: 103, g: 80, b: 164 })
const hsl = ref({ h: 261, s: 35, l: 48 })
const eyeDropperError = ref('')

const { input: hex, history, saveHistory } = useToolState<string, { hex: string }>({
  storageKey: 'color',
  defaultInput: '#6750a4',
  getHistoryData: (value) => ({ hex: value }),
  historyOptions: { maxCount: 15, generateLabel: (d) => d.hex.toUpperCase() },
})

function onHistorySelect(item: { data: { hex: string } }) { hex.value = item.data.hex }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function hexToRgb(hexStr: string) {
  const clean = hexStr.replace('#', '')
  if (!/^[0-9a-fA-F]{3,8}$/.test(clean)) return null
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.length === 4 ? clean.split('').map(c => c + c).join('').slice(0, 6) : clean.slice(0, 6)
  const num = parseInt(full, 16)
  if (isNaN(num)) return null
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) { case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break; case g: h = ((b - r) / d + 2) / 6; break; case b: h = ((r - g) / d + 4) / 6; break }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 } else if (h < 120) { r = x; g = c; b = 0 } else if (h < 180) { r = 0; g = c; b = x } else if (h < 240) { r = 0; g = x; b = c } else if (h < 300) { r = x; g = 0; b = c } else { r = c; g = 0; b = x }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

const colorPreviewBg = computed(() => `background-color: ${hex.value}`)

function updateFromHex() {
  const parsed = hexToRgb(hex.value)
  if (!parsed) return
  rgb.value = parsed; hsl.value = rgbToHsl(parsed.r, parsed.g, parsed.b)
}
function updateFromRgb() { hex.value = rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b); hsl.value = rgbToHsl(rgb.value.r, rgb.value.g, rgb.value.b); saveHistory() }
function updateFromHsl() { rgb.value = hslToRgb(hsl.value.h, hsl.value.s, hsl.value.l); hex.value = rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b); saveHistory() }

watch(hex, updateFromHex, { immediate: true })

const colorInputRef = ref<HTMLInputElement | null>(null)

async function pickColor() {
  eyeDropperError.value = ''
  if ('EyeDropper' in window) {
    try { const result = await new (window as any).EyeDropper().open(); hex.value = result.sRGBHex; saveHistory() }
    catch { /* 用户取消 */ }
  } else { colorInputRef.value?.click() }
}

function onNativeColorChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.value) { hex.value = target.value; saveHistory() }
}
</script>

<template>
  <ToolPage name="color" max-width="4xl">
    <input ref="colorInputRef" type="color" class="sr-only" @change="onNativeColorChange" />

    <ToolSection>
      <div class="mb-6 flex items-center gap-4">
        <div class="h-20 w-20 rounded-2xl shadow-sm outline outline-2 border-default" :style="colorPreviewBg" />
        <div class="flex-1">
          <div class="text-lg font-medium text-highlighted">{{ hex.toUpperCase() }}</div>
          <div class="mt-1 text-sm text-muted">rgb({{ rgb.r }}, {{ rgb.g }}, {{ rgb.b }})</div>
        </div>
        <UButton color="neutral" variant="ghost" @click="pickColor" class="rounded-full text-sm text-primary hover:bg-primary/10">
          <template #leading><UIcon name="i-lucide-pipette" class="size-4" /></template>屏幕取色
        </UButton>
      </div>
      <UAlert v-if="eyeDropperError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="eyeDropperError" />
    </ToolSection>

    <ToolSection>
      <div class="space-y-6">
        <div>
          <div class="mb-2 flex items-center justify-between">
            <label class="text-xs font-medium uppercase tracking-wider text-muted">HEX</label>
            <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
          </div>
          <div class="flex items-center gap-2">
            <UInput v-model="hex" @blur="saveHistory" placeholder="#RRGGBB" class="w-full" />
            <CopyBtn :text="hex.toUpperCase()" />
          </div>
        </div>

        <div>
          <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">RGB</label>
          <div class="flex items-center gap-3">
            <div v-for="key in ['r', 'g', 'b'] as const" :key="key" class="flex-1">
              <UInput v-model.number="rgb[key]" type="number" :min="0" :max="255" @change="updateFromRgb" class="w-full" />
              <div class="mt-1 text-center text-xs text-muted uppercase">{{ key }}</div>
            </div>
            <CopyBtn :text="`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`" />
          </div>
        </div>

        <div>
          <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">HSL</label>
          <div class="flex items-center gap-3">
            <div v-for="item in [{ key: 'h' as const, label: 'H', max: 360 }, { key: 's' as const, label: 'S%', max: 100 }, { key: 'l' as const, label: 'L%', max: 100 }]" :key="item.key" class="flex-1">
              <UInput v-model.number="hsl[item.key]" type="number" :min="0" :max="item.max" @change="updateFromHsl" class="w-full" />
              <div class="mt-1 text-center text-xs text-muted">{{ item.label }}</div>
            </div>
            <CopyBtn :text="`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`" />
          </div>
        </div>

        <div class="space-y-3">
          <div class="text-xs font-medium uppercase tracking-wider text-muted">其他格式</div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex items-center justify-between rounded-xl bg-elevated px-4 py-3">
              <code class="font-mono text-xs text-default">rgb({{ rgb.r }} {{ rgb.g }} {{ rgb.b }})</code>
              <CopyBtn :text="`rgb(${rgb.r} ${rgb.g} ${rgb.b})`" />
            </div>
            <div class="flex items-center justify-between rounded-xl bg-elevated px-4 py-3">
              <code class="font-mono text-xs text-default">hsl({{ hsl.h }} {{ hsl.s }}% {{ hsl.l }}%)</code>
              <CopyBtn :text="`hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`" />
            </div>
          </div>
        </div>
      </div>
    </ToolSection>
  </ToolPage>
</template>
