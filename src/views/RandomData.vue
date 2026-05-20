<script setup lang="ts">
import { ref, computed } from 'vue'
import { faker } from '@faker-js/faker'
import { Copy, Check, RefreshCw } from '@lucide/vue'

// 随机字符串
const strLength = ref(16)
const strCount = ref(5)
const strChars = ref('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
const randomStrings = ref<string[]>([])

function generateStrings() {
  const chars = strChars.value
  const res: string[] = []
  for (let i = 0; i < strCount.value; i++) {
    let s = ''
    for (let j = 0; j < strLength.value; j++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    res.push(s)
  }
  randomStrings.value = res
}

// 假数据
const fakeCategory = ref<'person' | 'address' | 'contact' | 'company' | 'internet'>('person')
const fakeCount = ref(5)
const fakeData = ref<Record<string, string>[]>([])

function generateFake() {
  const res: Record<string, string>[] = []
  for (let i = 0; i < fakeCount.value; i++) {
    switch (fakeCategory.value) {
      case 'person':
        res.push({
          姓名: faker.person.fullName() ?? '',
          性别: faker.person.sex() ?? '',
          生日: faker.date.birthdate()?.toISOString().split('T')[0] ?? '',
          职业: faker.person.jobTitle() ?? '',
        })
        break
      case 'address':
        res.push({
          国家: faker.location.country(),
          城市: faker.location.city(),
          街道: faker.location.streetAddress(),
          邮编: faker.location.zipCode(),
        })
        break
      case 'contact':
        res.push({
          手机号: faker.phone.number(),
          邮箱: faker.internet.email(),
        })
        break
      case 'company':
        res.push({
          公司名: faker.company.name(),
          标语: faker.company.catchPhrase(),
          行业: faker.company.buzzPhrase(),
        })
        break
      case 'internet':
        res.push({
          用户名: faker.internet.username(),
          邮箱: faker.internet.email(),
          域名: faker.internet.domainName(),
          IP: faker.internet.ip(),
          UserAgent: faker.internet.userAgent(),
        })
        break
    }
  }
  fakeData.value = res
}

const copiedMap = ref<Record<string, boolean>>({})
async function copy(val: string, key: string) {
  await navigator.clipboard.writeText(val)
  copiedMap.value[key] = true
  setTimeout(() => delete copiedMap.value[key], 1500)
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <!-- 随机字符串 -->
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <h3 class="mb-4 text-lg font-medium text-on-surface">随机字符串</h3>
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">长度</label>
          <input v-model.number="strLength" type="number" min="1" max="256" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">数量</label>
          <input v-model.number="strCount" type="number" min="1" max="100" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-on-surface-variant">字符集</label>
          <input v-model="strChars" type="text" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <button
        @click="generateStrings"
        class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
      >
        <RefreshCw class="h-4 w-4" />
        生成
      </button>

      <div v-if="randomStrings.length" class="mt-4 space-y-2">
        <div
          v-for="(s, idx) in randomStrings"
          :key="idx"
          class="flex items-center justify-between rounded-xl bg-surface-variant/50 px-4 py-2 font-mono text-sm text-on-surface"
        >
          <span class="break-all">{{ s }}</span>
          <button
            @click="copy(s, 'str-' + idx)"
            class="ml-3 shrink-0 rounded-full p-1.5 hover:bg-surface-variant"
          >
            <Check v-if="copiedMap['str-' + idx]" class="h-4 w-4 text-primary" />
            <Copy v-else class="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>

    <!-- 假数据 -->
    <div class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant">
      <h3 class="mb-4 text-lg font-medium text-on-surface">假数据生成</h3>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <select v-model="fakeCategory" class="h-10 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
          <option value="person">人物信息</option>
          <option value="address">地址</option>
          <option value="contact">联系方式</option>
          <option value="company">公司</option>
          <option value="internet">互联网</option>
        </select>
        <input v-model.number="fakeCount" type="number" min="1" max="50" class="h-10 w-24 rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <button
          @click="generateFake"
          class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw class="h-4 w-4" />
          生成
        </button>
      </div>

      <div v-if="fakeData.length" class="mt-4 space-y-3">
        <div
          v-for="(row, idx) in fakeData"
          :key="idx"
          class="rounded-xl bg-surface-variant/50 p-4"
        >
          <div class="mb-2 text-xs font-medium text-on-surface-variant">#{{ idx + 1 }}</div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div v-for="(val, key) in row" :key="key" class="flex items-center justify-between text-sm">
              <span class="text-on-surface-variant">{{ key }}:</span>
              <span class="ml-2 break-all text-right text-on-surface">{{ val }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
