<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Check, RefreshCw } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const copiedMap = ref<Record<string, boolean>>({})

async function copy(val: string, key: string) {
  const ok = await copyToClipboard(val)
  if (!ok) return
  copiedMap.value[key] = true
  setTimeout(() => delete copiedMap.value[key], 1500)
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 手机号
function genPhone(): string {
  const prefixes = [
    '138', '139', '135', '136', '137', '150', '151', '152', '157', '158', '159',
    '182', '183', '187', '188', '130', '131', '132', '155', '156', '185', '186',
    '133', '153', '180', '189', '176', '177', '178', '198', '199', '166',
  ]
  const prefix = prefixes[randomInt(0, prefixes.length - 1)]
  const suffix = String(randomInt(0, 99999999)).padStart(8, '0')
  return prefix + suffix
}

// 身份证号
function genIdCard(): string {
  const areaCodes = [
    '110101', '110105', '310101', '310115', '440106', '440305',
    '500101', '500103', '330106', '330104', '320106', '320104',
    '420106', '420104', '610104', '610113', '510107', '510104',
  ]
  const area = areaCodes[randomInt(0, areaCodes.length - 1)]
  const start = new Date(1960, 0, 1).getTime()
  const end = new Date(2005, 11, 31).getTime()
  const birthDate = new Date(start + Math.random() * (end - start))
  const ymd = birthDate.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(randomInt(0, 999)).padStart(3, '0')
  const body = area + ymd + seq
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(body[i]!) * weights[i]!
  }
  return body + checkCodes[sum % 11]
}

// 邮箱
function genEmail(): string {
  const names = ['zhang', 'li', 'wang', 'zhao', 'chen', 'liu', 'yang', 'huang', 'zhou', 'wu', 'sun', 'ma', 'zhu']
  const domains = ['qq.com', '163.com', '126.com', 'gmail.com', 'outlook.com', 'sina.com', 'foxmail.com', 'yeah.net']
  const name = names[randomInt(0, names.length - 1)]! + randomInt(10, 9999)
  const domain = domains[randomInt(0, domains.length - 1)]!
  return `${name}@${domain}`
}

// 银行卡号 (Luhn)
function genBankCard(): string {
  const prefix = '6222'
  let num = prefix
  for (let i = 0; i < 11; i++) num += randomInt(0, 9)
  let sum = 0
  let alternate = false
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num.substring(i, i + 1))
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  const check = (10 - (sum % 10)) % 10
  return num + check
}

// UUID
function genUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// IPv4
function genIP(): string {
  return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`
}

// MAC
function genMAC(): string {
  return Array.from({ length: 6 }, () => randomInt(0, 255).toString(16).padStart(2, '0')).join(':')
}

// 密码
function genPassword(len = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[randomInt(0, chars.length - 1)]
  return s
}

// 姓名
async function genName(): Promise<string> {
  const mod = await import('@faker-js/faker')
  const f = (mod as any).fakerZH_CN || mod.faker
  return f.person.fullName()
}

// 地址
async function genAddress(): Promise<string> {
  const mod = await import('@faker-js/faker')
  const f = (mod as any).fakerZH_CN || mod.faker
  return f.location.city() + f.location.streetAddress()
}

// 公司名
async function genCompany(): Promise<string> {
  const mod = await import('@faker-js/faker')
  const f = (mod as any).fakerZH_CN || mod.faker
  return f.company.name()
}

// 随机字符串
function genRandomString(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < 16; i++) s += chars[randomInt(0, chars.length - 1)]
  return s
}

interface Generator {
  key: string
  label: string
  gen: () => string | Promise<string>
}

const generators: Generator[] = [
  { key: 'phone', label: '手机号', gen: genPhone },
  { key: 'idcard', label: '身份证号', gen: genIdCard },
  { key: 'email', label: '邮箱', gen: genEmail },
  { key: 'bank', label: '银行卡号', gen: genBankCard },
  { key: 'uuid', label: 'UUID', gen: genUUID },
  { key: 'ip', label: 'IPv4', gen: genIP },
  { key: 'mac', label: 'MAC 地址', gen: genMAC },
  { key: 'password', label: '随机密码', gen: () => genPassword(16) },
  { key: 'name', label: '姓名', gen: genName },
  { key: 'address', label: '地址', gen: genAddress },
  { key: 'company', label: '公司名', gen: genCompany },
  { key: 'string', label: '随机字符串', gen: genRandomString },
]

const results = ref<Record<string, string>>({})
const loading = ref<Record<string, boolean>>({})

async function generate(key: string) {
  const g = generators.find((x) => x.key === key)
  if (!g) return
  loading.value[key] = true
  try {
    const val = await g.gen()
    results.value[key] = val
  } catch {
    results.value[key] = '生成失败'
  } finally {
    loading.value[key] = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="g in generators"
        :key="g.key"
        class="rounded-2xl bg-surface p-4 shadow-sm outline outline-1 outline-outline-variant"
      >
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-medium text-on-surface">{{ g.label }}</span>
          <button
            @click="generate(g.key)"
            class="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-variant transition-colors"
            :disabled="loading[g.key]"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="loading[g.key] ? 'animate-spin' : ''" />
          </button>
        </div>
        <div class="flex items-center gap-2">
          <div
            class="flex-1 truncate rounded-xl bg-surface-variant/50 px-3 py-2 font-mono text-sm text-on-surface"
          >
            {{ results[g.key] || '-' }}
          </div>
          <button
            v-if="results[g.key] && results[g.key] !== '生成失败'"
            @click="copy(results[g.key]!, g.key)"
            class="rounded-full p-1.5 hover:bg-surface-variant transition-colors"
          >
            <Check v-if="copiedMap[g.key]" class="h-4 w-4 text-primary" />
            <Copy v-else class="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
