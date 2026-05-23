<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import CopyBtn from '@/components/CopyBtn.vue'

function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

function genPhone(): string {
  const prefixes = ['138', '139', '135', '136', '137', '150', '151', '152', '157', '158', '159', '182', '183', '187', '188', '130', '131', '132', '155', '156', '185', '186', '133', '153', '180', '189', '176', '177', '178', '198', '199', '166']
  return prefixes[randomInt(0, prefixes.length - 1)] + String(randomInt(0, 99999999)).padStart(8, '0')
}
function genIdCard(): string {
  const areaCodes = ['110101', '110105', '310101', '310115', '440106', '440305', '500101', '500103', '330106', '330104', '320106', '320104', '420106', '420104', '610104', '610113', '510107', '510104']
  const area = areaCodes[randomInt(0, areaCodes.length - 1)]
  const start = new Date(1960, 0, 1).getTime(), end = new Date(2005, 11, 31).getTime()
  const ymd = new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(randomInt(0, 999)).padStart(3, '0')
  const body = area + ymd + seq
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0; for (let i = 0; i < 17; i++) sum += parseInt(body[i]!) * weights[i]!
  return body + checkCodes[sum % 11]
}
function genEmail(): string {
  const names = ['zhang', 'li', 'wang', 'zhao', 'chen', 'liu', 'yang', 'huang', 'zhou', 'wu', 'sun', 'ma', 'zhu']
  const domains = ['qq.com', '163.com', '126.com', 'gmail.com', 'outlook.com', 'sina.com', 'foxmail.com', 'yeah.net']
  return `${names[randomInt(0, names.length - 1)]}${randomInt(10, 9999)}@${domains[randomInt(0, domains.length - 1)]}`
}
function genBankCard(): string {
  const prefix = '6222'; let num = prefix
  for (let i = 0; i < 11; i++) num += randomInt(0, 9)
  let sum = 0; let alternate = false
  for (let i = num.length - 1; i >= 0; i--) { let n = parseInt(num.substring(i, i + 1)); if (alternate) { n *= 2; if (n > 9) n -= 9 }; sum += n; alternate = !alternate }
  return num + ((10 - (sum % 10)) % 10)
}
function genUUID(): string { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16) }) }
function genIP(): string { return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}` }
function genMAC(): string { return Array.from({ length: 6 }, () => randomInt(0, 255).toString(16).padStart(2, '0')).join(':') }
function genPassword(len = 16): string { const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'; let s = ''; for (let i = 0; i < len; i++) s += chars[randomInt(0, chars.length - 1)]; return s }
function genRandomString(): string { const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let s = ''; for (let i = 0; i < 16; i++) s += chars[randomInt(0, chars.length - 1)]; return s }

async function genName(): Promise<string> { const mod = await import('@faker-js/faker'); const f = (mod as any).fakerZH_CN || mod.faker; return f.person.fullName() }
async function genAddress(): Promise<string> { const mod = await import('@faker-js/faker'); const f = (mod as any).fakerZH_CN || mod.faker; return f.location.city() + f.location.streetAddress() }
async function genCompany(): Promise<string> { const mod = await import('@faker-js/faker'); const f = (mod as any).fakerZH_CN || mod.faker; return f.company.name() }

interface Generator { key: string; label: string; gen: () => string | Promise<string> }
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
  try { const val = await g.gen(); results.value[key] = val }
  catch { results.value[key] = '生成失败' }
  finally { loading.value[key] = false }
}

function generateAll() {
  generators.forEach((g) => generate(g.key))
}
</script>

<template>
  <ToolLayout max-width="5xl">
    <ToolHeader title="随机数据生成" description="一键生成手机号、身份证、UUID、密码等常用测试数据" icon="i-lucide-dices">
      <template #actions>
        <UButton color="primary" variant="soft" icon="i-lucide-refresh-cw" @click="generateAll">
          全部生成
        </UButton>
      </template>
    </ToolHeader>

    <ToolCard compact>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard v-for="g in generators" :key="g.key" compact>
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm font-medium text-default">{{ g.label }}</span>
            <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" @click="generate(g.key)" :disabled="loading[g.key]" class="rounded-full" :class="loading[g.key] ? 'animate-spin' : ''" size="xs" />
          </div>
          <div class="flex items-center gap-2">
            <div class="flex-1 truncate rounded-xl bg-elevated px-3 py-2 font-mono text-sm text-default">{{ results[g.key] || '-' }}</div>
            <CopyBtn v-if="results[g.key] && results[g.key] !== '生成失败'" :text="results[g.key]!" />
          </div>
        </ToolCard>
      </div>
    </ToolCard>
  </ToolLayout>
</template>
