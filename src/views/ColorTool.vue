<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check, Pipette } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'

const hex = usePersistedRef('web-tools:color:hex', '#6750a4')
const rgb = ref({ r: 103, g: 80, b: 164 })

const colorHistory = useHistory<{ hex: string }>('web-tools:color:history', {
  maxCount: 15,
  generateLabel: (d) => d.hex.toUpperCase(),
})

function saveHistory() {
  if (!hex.value.trim()) return
  colorHistory.add({ hex: hex.value })
}

function onHistorySelect(item: { data: { hex: string } }) {
  hex.value = item.data.hex
}
const hsl = ref({ h: 261, s: 35, l: 48 })
const copied = ref<Record<string, boolean>>({})
const eyeDropperError = ref('')

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function hexToRgb(hexStr: string) {
  const clean = hexStr.replace('#', '')
  if (!/^[0-9a-fA-F]{3,8}$/.test(clean)) return null
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.length === 4
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
            .slice(0, 6)
        : clean.slice(0, 6)
  const num = parseInt(full, 16)
  if (isNaN(num)) return null
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0
  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function updateFromHex() {
  const c = hexToRgb(hex.value)
  if (!c) return
  rgb.value = c
  hsl.value = rgbToHsl(c.r, c.g, c.b)
}

function updateFromRgb() {
  const r = clamp(rgb.value.r, 0, 255)
  const g = clamp(rgb.value.g, 0, 255)
  const b = clamp(rgb.value.b, 0, 255)
  rgb.value = { r, g, b }
  hex.value = rgbToHex(r, g, b)
  hsl.value = rgbToHsl(r, g, b)
}

function updateFromHsl() {
  const h = ((hsl.value.h % 360) + 360) % 360
  const s = clamp(hsl.value.s, 0, 100)
  const l = clamp(hsl.value.l, 0, 100)
  hsl.value = { h, s, l }
  const c = hslToRgb(h, s, l)
  rgb.value = c
  hex.value = rgbToHex(c.r, c.g, c.b)
}

const previewStyle = computed(() => ({
  backgroundColor: hex.value,
}))

const contrastColor = computed(() => {
  const { r, g, b } = rgb.value
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#ffffff'
})

async function copy(val: string, key: string) {
  const ok = await copyToClipboard(val)
  if (!ok) return
  copied.value[key] = true
  setTimeout(() => delete copied.value[key], 1500)
}

const eyeDropperSupported = 'EyeDropper' in window

async function openEyeDropper() {
  eyeDropperError.value = ''
  try {
    const eyeDropper = new (window as any).EyeDropper()
    const result = await eyeDropper.open()
    if (result && result.sRGBHex) {
      hex.value = result.sRGBHex
      updateFromHex()
    }
  } catch (e: any) {
    if (e.message && !e.message.includes('aborted')) {
      eyeDropperError.value = '取色失败：' + e.message
    }
  }
}

watch(hex, updateFromHex)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- 预览 -->
    <div
      class="relative flex h-32 items-center justify-center rounded-2xl shadow-sm outline outline-1 outline-outline-variant"
      :style="previewStyle"
    >
      <span class="text-2xl font-bold" :style="{ color: contrastColor }">{{
        hex.toUpperCase()
      }}</span>
      <button
        v-if="eyeDropperSupported"
        @click="openEyeDropper"
        class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full bg-surface/80 px-4 py-2 text-sm font-medium text-on-surface shadow-sm backdrop-blur hover:bg-surface transition-colors"
      >
        <Pipette class="h-4 w-4" />
        屏幕取色
      </button>
    </div>
    <div v-if="eyeDropperError" class="text-xs text-error">{{ eyeDropperError }}</div>

    <div
      class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-5"
    >
      <!-- HEX -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-sm font-medium text-on-surface-variant">HEX</label>
          <HistoryPanel
            :items="colorHistory.items.value"
            @select="onHistorySelect"
            @remove="colorHistory.remove"
            @clear="colorHistory.clear"
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="hex"
            @blur="saveHistory"
            placeholder="#RRGGBB"
            class="h-10 flex-1 rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            @click="copy(hex.toUpperCase(), 'hex')"
            class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-variant transition-colors"
          >
            <Check v-if="copied['hex']" class="h-4 w-4 text-primary" />
            <Copy v-else class="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>

      <!-- RGB -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-on-surface-variant">RGB</label>
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <input
              v-model.number="rgb.r"
              type="number"
              min="0"
              max="255"
              @change="updateFromRgb"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div class="mt-1 text-center text-xs text-on-surface-variant">R</div>
          </div>
          <div class="flex-1">
            <input
              v-model.number="rgb.g"
              type="number"
              min="0"
              max="255"
              @change="updateFromRgb"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div class="mt-1 text-center text-xs text-on-surface-variant">G</div>
          </div>
          <div class="flex-1">
            <input
              v-model.number="rgb.b"
              type="number"
              min="0"
              max="255"
              @change="updateFromRgb"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div class="mt-1 text-center text-xs text-on-surface-variant">B</div>
          </div>
          <button
            @click="copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-variant transition-colors"
          >
            <Check v-if="copied['rgb']" class="h-4 w-4 text-primary" />
            <Copy v-else class="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>

      <!-- HSL -->
      <div>
        <label class="mb-1.5 block text-sm font-medium text-on-surface-variant">HSL</label>
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <input
              v-model.number="hsl.h"
              type="number"
              min="0"
              max="360"
              @change="updateFromHsl"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div class="mt-1 text-center text-xs text-on-surface-variant">H</div>
          </div>
          <div class="flex-1">
            <input
              v-model.number="hsl.s"
              type="number"
              min="0"
              max="100"
              @change="updateFromHsl"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div class="mt-1 text-center text-xs text-on-surface-variant">S%</div>
          </div>
          <div class="flex-1">
            <input
              v-model.number="hsl.l"
              type="number"
              min="0"
              max="100"
              @change="updateFromHsl"
              class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div class="mt-1 text-center text-xs text-on-surface-variant">L%</div>
          </div>
          <button
            @click="copy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-variant transition-colors"
          >
            <Check v-if="copied['hsl']" class="h-4 w-4 text-primary" />
            <Copy v-else class="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>

      <!-- 其他格式 -->
      <div class="space-y-2">
        <div class="text-sm font-medium text-on-surface-variant">其他格式</div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="flex items-center justify-between rounded-xl bg-surface-variant/50 px-3 py-2">
            <code class="font-mono text-xs text-on-surface"
              >rgb({{ rgb.r }} {{ rgb.g }} {{ rgb.b }})</code
            >
            <button
              @click="copy(`rgb(${rgb.r} ${rgb.g} ${rgb.b})`, 'rgb-space')"
              class="rounded p-1 hover:bg-surface-variant"
            >
              <Check v-if="copied['rgb-space']" class="h-3 w-3 text-primary" />
              <Copy v-else class="h-3 w-3 text-on-surface-variant" />
            </button>
          </div>
          <div class="flex items-center justify-between rounded-xl bg-surface-variant/50 px-3 py-2">
            <code class="font-mono text-xs text-on-surface"
              >hsl({{ hsl.h }} {{ hsl.s }}% {{ hsl.l }}%)</code
            >
            <button
              @click="copy(`hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`, 'hsl-space')"
              class="rounded p-1 hover:bg-surface-variant"
            >
              <Check v-if="copied['hsl-space']" class="h-3 w-3 text-primary" />
              <Copy v-else class="h-3 w-3 text-on-surface-variant" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
