<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Hash,
  Braces,
  Code,
  Clock,
  QrCode,
  Type,
  Shuffle,
  Lock,
  Regex,
  Image,
} from '@lucide/vue'

const router = useRouter()

const tools = [
  { path: '/hash', label: '哈希计算', desc: 'MD5、SHA1、SHA256、SHA512、SM3', icon: Hash, color: 'bg-red-100 text-red-700' },
  { path: '/json', label: 'JSON 编辑器', desc: '格式化、美化、验证 JSON', icon: Braces, color: 'bg-blue-100 text-blue-700' },
  { path: '/base64', label: 'Base64', desc: '编码与解码', icon: Code, color: 'bg-emerald-100 text-emerald-700' },
  { path: '/timestamp', label: '时间戳', desc: '日期转换、时区计算、日期差值', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  { path: '/qrcode', label: '二维码', desc: '生成二维码图片', icon: QrCode, color: 'bg-indigo-100 text-indigo-700' },
  { path: '/encoding', label: '字符编码', desc: 'Unicode、GBK 等编码转换', icon: Type, color: 'bg-cyan-100 text-cyan-700' },
  { path: '/random', label: '随机数据', desc: '随机字符串、假数据生成', icon: Shuffle, color: 'bg-violet-100 text-violet-700' },
  { path: '/crypto', label: '加解密', desc: 'AES、SM2、RSA、JWT、Bcrypt', icon: Lock, color: 'bg-rose-100 text-rose-700' },
  { path: '/regex', label: '正则表达式', desc: '编辑、测试、匹配正则', icon: Regex, color: 'bg-orange-100 text-orange-700' },
  { path: '/image', label: '图片压缩', desc: '有损与无损压缩', icon: Image, color: 'bg-teal-100 text-teal-700' },
]

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div>
    <h2 class="mb-6 text-2xl font-medium text-on-surface">全部工具</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="tool in tools"
        :key="tool.path"
        @click="go(tool.path)"
        class="flex flex-col items-start rounded-2xl bg-surface p-5 text-left shadow-sm outline outline-1 outline-outline-variant transition-all hover:shadow-md hover:outline-primary/50"
      >
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" :class="tool.color">
          <component :is="tool.icon" class="h-6 w-6" />
        </div>
        <h3 class="text-lg font-medium text-on-surface">{{ tool.label }}</h3>
        <p class="mt-1 text-sm text-on-surface-variant">{{ tool.desc }}</p>
      </button>
    </div>
  </div>
</template>
