<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToolState } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'

const { t } = useI18n()
const rgb = ref({ r: 103, g: 80, b: 164 })
const hsl = ref({ h: 261, s: 35, l: 48 })
const eyeDropperError = ref('')

const { input: hex, history, saveHistory } = useToolState<string, { hex: string }>({
  storageKey: 'color',
  defaultInput: '#6750a4',
  getHistoryData: (value) => ({ hex: value }),
  historyOptions: { maxCount: 15, generateLabel: (d) => d.hex.toUpperCase() },
})

const commonSwatches = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
]
const neutralSwatches = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#0f172a', '#000000']

function onHistorySelect(item: { data: { hex: string } }) { setHex(item.data.hex, false) }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function normalizeHex(value: string) {
  const parsed = hexToRgb(value)
  return parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : null
}
function hexToRgb(hexStr: string) {
  const clean = hexStr.replace('#', '')
  if (!/^[0-9a-fA-F]{3,8}$/.test(clean)) return null
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.length === 4 ? clean.split('').map(c => c + c).join('').slice(0, 6) : clean.slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return null
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
  h = ((h % 360) + 360) % 360
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 } else if (h < 120) { r = x; g = c; b = 0 } else if (h < 180) { r = 0; g = c; b = x } else if (h < 240) { r = 0; g = x; b = c } else if (h < 300) { r = x; g = 0; b = c } else { r = c; g = 0; b = x }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

const normalizedHex = computed(() => normalizeHex(hex.value) ?? hex.value)
const colorPreviewBg = computed(() => `background-color: ${normalizedHex.value}`)
const shadeSwatches = computed(() => [96, 88, 76, 64, 52, 40, 28, 16].map((lightness) => rgbToHex(...Object.values(hslToRgb(hsl.value.h, hsl.value.s, lightness)) as [number, number, number])))
const historySwatches = computed(() => history.items.value.map((item) => normalizeHex(item.data.hex)).filter((item): item is string => Boolean(item)).slice(0, 12))
const swatchGroups = computed(() => [
  { title: t('tools.color.currentShades'), colors: shadeSwatches.value },
  { title: t('tools.color.commonColors'), colors: commonSwatches },
  { title: t('tools.color.neutralColors'), colors: neutralSwatches },
  { title: t('tools.color.historyColors'), colors: historySwatches.value },
].filter((group) => group.colors.length))

function updateFromHex() {
  const parsed = hexToRgb(hex.value)
  if (!parsed) return
  rgb.value = parsed
  hsl.value = rgbToHsl(parsed.r, parsed.g, parsed.b)
}
function updateFromRgb() {
  hex.value = rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b)
  hsl.value = rgbToHsl(rgb.value.r, rgb.value.g, rgb.value.b)
  saveHistory()
}
function updateFromHsl() {
  rgb.value = hslToRgb(hsl.value.h, hsl.value.s, hsl.value.l)
  hex.value = rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b)
  saveHistory()
}
function setHex(value: string, shouldSave = true) {
  const normalized = normalizeHex(value)
  if (!normalized) return
  hex.value = normalized
  if (shouldSave) saveHistory()
}

watch(hex, updateFromHex, { immediate: true })

const colorInputRef = ref<HTMLInputElement | null>(null)

async function pickColor() {
  eyeDropperError.value = ''
  if ('EyeDropper' in window) {
    try {
      const result = await new (window as typeof window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open()
      setHex(result.sRGBHex)
    } catch {}
  } else {
    colorInputRef.value?.click()
  }
}

function onNativeColorChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.value) setHex(target.value)
}
</script>

<template>
  <ToolPage name="color" max-width="6xl">
    <input ref="colorInputRef" type="color" class="sr-only" @change="onNativeColorChange" />

    <div class="tool-workspace">
      <div class="space-y-4">
        <ToolSection :title="$t('tools.color.inputTitle')" :description="$t('tools.color.inputDesc')">
          <div class="space-y-6">
            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="text-xs font-medium uppercase tracking-wider text-muted">HEX</label>
                <HistoryPanel :items="history.items.value" @select="onHistorySelect" @remove="history.remove" @clear="history.clear" />
              </div>
              <div class="flex items-center gap-2">
                <UInput v-model="hex" placeholder="#RRGGBB" class="w-full" @blur="setHex(hex)" />
                <CopyBtn :text="normalizedHex.toUpperCase()" />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">RGB</label>
              <div class="flex items-center gap-3">
                <div v-for="key in ['r', 'g', 'b'] as const" :key="key" class="flex-1">
                  <UInput v-model.number="rgb[key]" type="number" :min="0" :max="255" class="w-full" @change="updateFromRgb" />
                  <div class="mt-1 text-center text-xs text-muted uppercase">{{ key }}</div>
                </div>
                <CopyBtn :text="`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`" />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">HSL</label>
              <div class="flex items-center gap-3">
                <div v-for="item in [{ key: 'h' as const, label: 'H', max: 360 }, { key: 's' as const, label: 'S%', max: 100 }, { key: 'l' as const, label: 'L%', max: 100 }]" :key="item.key" class="flex-1">
                  <UInput v-model.number="hsl[item.key]" type="number" :min="0" :max="item.max" class="w-full" @change="updateFromHsl" />
                  <div class="mt-1 text-center text-xs text-muted">{{ item.label }}</div>
                </div>
                <CopyBtn :text="`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`" />
              </div>
            </div>

            <div class="space-y-3">
              <div class="text-xs font-medium uppercase tracking-wider text-muted">{{ $t('tools.color.otherFormats') }}</div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="tool-list-item flex items-center justify-between gap-3">
                  <code class="font-mono text-xs text-default">rgb({{ rgb.r }} {{ rgb.g }} {{ rgb.b }})</code>
                  <CopyBtn :text="`rgb(${rgb.r} ${rgb.g} ${rgb.b})`" />
                </div>
                <div class="tool-list-item flex items-center justify-between gap-3">
                  <code class="font-mono text-xs text-default">hsl({{ hsl.h }} {{ hsl.s }}% {{ hsl.l }}%)</code>
                  <CopyBtn :text="`hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`" />
                </div>
              </div>
            </div>
          </div>
        </ToolSection>
      </div>

      <div class="tool-preview-sticky space-y-4">
        <ToolSection :title="$t('tools.color.previewTitle')" compact>
          <div class="tool-stage p-5">
            <div class="h-40 rounded-[1.75rem] border border-default/60 shadow-lg shadow-default/10 ring-4 ring-default/60" :style="colorPreviewBg" />
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-2xl font-black tracking-tight text-highlighted">{{ normalizedHex.toUpperCase() }}</div>
                <div class="mt-1 text-sm text-muted">rgb({{ rgb.r }}, {{ rgb.g }}, {{ rgb.b }}) · hsl({{ hsl.h }}, {{ hsl.s }}%, {{ hsl.l }}%)</div>
              </div>
              <UButton color="primary" variant="soft" icon="i-lucide-pipette" class="rounded-full" @click="pickColor">
                {{ $t('tools.color.screenPicker') }}
              </UButton>
            </div>
          </div>
          <UAlert v-if="eyeDropperError" class="mt-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="eyeDropperError" />
        </ToolSection>

        <ToolSection :title="$t('tools.color.swatchesTitle')" :description="$t('tools.color.swatchesDesc')" compact>
          <div class="space-y-5">
            <div v-for="group in swatchGroups" :key="group.title">
              <div class="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{{ group.title }}</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in group.colors"
                  :key="`${group.title}-${color}`"
                  type="button"
                  class="size-9 rounded-xl border border-default shadow-sm transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  :class="normalizeHex(color) === normalizedHex ? 'ring-2 ring-primary ring-offset-2 ring-offset-default' : ''"
                  :style="`background-color: ${color}`"
                  :aria-label="t('tools.color.useColor', { color })"
                  @click="setHex(color)"
                />
              </div>
            </div>
          </div>
        </ToolSection>
      </div>
    </div>
  </ToolPage>
</template>
