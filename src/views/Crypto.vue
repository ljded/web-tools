<script setup lang="ts">
import { ref, computed } from 'vue'
import CryptoJS from 'crypto-js'
import { sm2, sm4 } from 'sm-crypto'
import JSEncrypt from 'jsencrypt'
import bcrypt from 'bcryptjs'
import { Copy, Check, RefreshCw } from '@lucide/vue'
import { copyToClipboard } from '@/utils/clipboard'

const tab = ref<'aes' | 'sm2' | 'rsa' | 'jwt' | 'bcrypt' | 'sm4'>('aes')
const copiedMap = ref<Record<string, boolean>>({})
async function copy(val: string, key: string) {
  const ok = await copyToClipboard(val)
  if (!ok) return
  copiedMap.value[key] = true
  setTimeout(() => delete copiedMap.value[key], 1500)
}

// AES
const aesText = ref('Hello World')
const aesKey = ref('my-secret-key')
const aesMode = ref<'encrypt' | 'decrypt'>('encrypt')
const aesResult = computed(() => {
  if (!aesText.value || !aesKey.value) return ''
  try {
    if (aesMode.value === 'encrypt') {
      return CryptoJS.AES.encrypt(aesText.value, aesKey.value).toString()
    } else {
      const bytes = CryptoJS.AES.decrypt(aesText.value, aesKey.value)
      return bytes.toString(CryptoJS.enc.Utf8) || '解密失败，请检查密钥和密文'
    }
  } catch {
    return '操作失败'
  }
})

// SM2
const sm2Text = ref('Hello SM2')
const sm2PubKey = ref('')
const sm2PriKey = ref('')
const sm2Mode = ref<'encrypt' | 'decrypt' | 'sign' | 'verify'>('encrypt')
const sm2Result = computed(() => {
  if (!sm2Text.value) return ''
  try {
    if (sm2Mode.value === 'encrypt') {
      if (!sm2PubKey.value) return '请输入公钥'
      return sm2.doEncrypt(sm2Text.value, sm2PubKey.value, 1)
    } else if (sm2Mode.value === 'decrypt') {
      if (!sm2PriKey.value) return '请输入私钥'
      return sm2.doDecrypt(sm2Text.value, sm2PriKey.value, 1) || '解密失败'
    } else if (sm2Mode.value === 'sign') {
      if (!sm2PriKey.value) return '请输入私钥'
      return sm2.doSignature(sm2Text.value, sm2PriKey.value)
    } else {
      if (!sm2PubKey.value) return '请输入公钥'
      const sig = sm2Text.value.split('||')[1] || ''
      const msg = sm2Text.value.split('||')[0] || ''
      if (!sig || !msg) return '格式：消息||签名'
      const ok = sm2.doVerifySignature(msg, sig, sm2PubKey.value)
      return ok ? '✅ 签名验证通过' : '❌ 签名验证失败'
    }
  } catch {
    return '操作失败'
  }
})

function genSm2Keys() {
  const keys = sm2.generateKeyPairHex()
  sm2PubKey.value = keys.publicKey
  sm2PriKey.value = keys.privateKey
}

// RSA
const rsaText = ref('Hello RSA')
const rsaPubKey = ref('')
const rsaPriKey = ref('')
const rsaMode = ref<'encrypt' | 'decrypt'>('encrypt')
const rsaResult = computed(() => {
  if (!rsaText.value) return ''
  try {
    const crypt = new JSEncrypt()
    if (rsaMode.value === 'encrypt') {
      if (!rsaPubKey.value) return '请输入公钥'
      crypt.setPublicKey(rsaPubKey.value)
      return crypt.encrypt(rsaText.value) || '加密失败'
    } else {
      if (!rsaPriKey.value) return '请输入私钥'
      crypt.setPrivateKey(rsaPriKey.value)
      return crypt.decrypt(rsaText.value) || '解密失败'
    }
  } catch {
    return '操作失败'
  }
})

function genRsaKeys() {
  const encrypt = new JSEncrypt({ default_key_size: '2048' })
  rsaPubKey.value = encrypt.getPublicKey()
  rsaPriKey.value = encrypt.getPrivateKey()
}

// JWT
const jwtToken = ref('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
const jwtParsed = computed(() => {
  try {
    const parts = jwtToken.value.split('.')
    if (parts.length !== 3) throw new Error('格式错误')
    const header = JSON.parse(atob(parts[0]!.replace(/-/g, '+').replace(/_/g, '/')))
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    return { header, payload }
  } catch (e: any) {
    return { error: e.message || '解析失败' }
  }
})

// Bcrypt
const bcryptText = ref('password123')
const bcryptHash = ref('')
const bcryptCompare = ref('')
const bcryptResult = computed(() => {
  if (!bcryptText.value) return ''
  if (bcryptCompare.value) {
    return bcrypt.compareSync(bcryptText.value, bcryptCompare.value) ? '✅ 密码匹配' : '❌ 密码不匹配'
  }
  return ''
})
function doBcryptHash() {
  if (!bcryptText.value) return
  bcryptHash.value = bcrypt.hashSync(bcryptText.value, 10)
}

// SM4
const sm4Text = ref('Hello SM4')
const sm4Key = ref('1234567890abcdef')
const sm4Mode = ref<'encrypt' | 'decrypt'>('encrypt')
const sm4Result = computed(() => {
  if (!sm4Text.value || !sm4Key.value) return ''
  try {
    if (sm4Mode.value === 'encrypt') {
      return sm4.encrypt(sm4Text.value, sm4Key.value)
    } else {
      return sm4.decrypt(sm4Text.value, sm4Key.value) || '解密失败'
    }
  } catch {
    return '操作失败'
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <!-- Tab -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in ['aes','sm2','rsa','jwt','bcrypt','sm4'] as const"
        :key="t"
        @click="tab = t"
        class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
        :class="tab === t ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80'"
      >
        {{ t.toUpperCase() }}
      </button>
    </div>

    <!-- AES -->
    <div v-if="tab === 'aes'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <h3 class="text-lg font-medium text-on-surface">AES 加解密</h3>
      <div class="flex gap-3">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button @click="aesMode = 'encrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="aesMode === 'encrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">加密</button>
          <button @click="aesMode = 'decrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="aesMode === 'decrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">解密</button>
        </div>
      </div>
      <input v-model="aesKey" placeholder="密钥" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <textarea v-model="aesText" :placeholder="aesMode === 'encrypt' ? '输入明文' : '输入密文'" class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <div v-if="aesResult" class="rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface break-all">
        <div class="mb-1 text-xs text-on-surface-variant">结果</div>
        {{ aesResult }}
        <button @click="copy(aesResult, 'aes')" class="ml-2 rounded-full p-1 hover:bg-surface-variant inline-flex align-middle">
          <Check v-if="copiedMap['aes']" class="h-4 w-4 text-primary" />
          <Copy v-else class="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>
    </div>

    <!-- SM2 -->
    <div v-if="tab === 'sm2'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <h3 class="text-lg font-medium text-on-surface">SM2 国密算法</h3>
      <button @click="genSm2Keys" class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
        <RefreshCw class="h-4 w-4" />
        生成密钥对
      </button>
      <div class="grid grid-cols-1 gap-3">
        <textarea v-model="sm2PubKey" placeholder="公钥" class="h-20 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-xs font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <textarea v-model="sm2PriKey" placeholder="私钥" class="h-20 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-xs font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      <div class="flex gap-3 flex-wrap">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button @click="sm2Mode = 'encrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm2Mode === 'encrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">加密</button>
          <button @click="sm2Mode = 'decrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm2Mode === 'decrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">解密</button>
          <button @click="sm2Mode = 'sign'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm2Mode === 'sign' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">签名</button>
          <button @click="sm2Mode = 'verify'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm2Mode === 'verify' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">验签</button>
        </div>
      </div>
      <textarea v-model="sm2Text" :placeholder="sm2Mode === 'verify' ? '消息||签名' : '输入内容'" class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <div v-if="sm2Result" class="rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface break-all">
        {{ sm2Result }}
        <button @click="copy(sm2Result, 'sm2')" class="ml-2 rounded-full p-1 hover:bg-surface-variant inline-flex align-middle">
          <Check v-if="copiedMap['sm2']" class="h-4 w-4 text-primary" />
          <Copy v-else class="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>
    </div>

    <!-- RSA -->
    <div v-if="tab === 'rsa'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <h3 class="text-lg font-medium text-on-surface">RSA 加解密</h3>
      <button @click="genRsaKeys" class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
        <RefreshCw class="h-4 w-4" />
        生成密钥对 (2048)
      </button>
      <div class="grid grid-cols-1 gap-3">
        <textarea v-model="rsaPubKey" placeholder="公钥" class="h-24 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-xs font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <textarea v-model="rsaPriKey" placeholder="私钥" class="h-24 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-xs font-mono text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      <div class="flex gap-3">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button @click="rsaMode = 'encrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="rsaMode === 'encrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">加密</button>
          <button @click="rsaMode = 'decrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="rsaMode === 'decrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">解密</button>
        </div>
      </div>
      <textarea v-model="rsaText" :placeholder="rsaMode === 'encrypt' ? '输入明文' : '输入密文'" class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <div v-if="rsaResult" class="rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface break-all">
        {{ rsaResult }}
        <button @click="copy(rsaResult, 'rsa')" class="ml-2 rounded-full p-1 hover:bg-surface-variant inline-flex align-middle">
          <Check v-if="copiedMap['rsa']" class="h-4 w-4 text-primary" />
          <Copy v-else class="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>
    </div>

    <!-- JWT -->
    <div v-if="tab === 'jwt'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <h3 class="text-lg font-medium text-on-surface">JWT 解析</h3>
      <textarea v-model="jwtToken" placeholder="粘贴 JWT Token..." class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <div v-if="'error' in jwtParsed" class="text-sm text-error">{{ jwtParsed.error }}</div>
      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="rounded-xl bg-surface-variant/50 p-3">
          <div class="mb-1 text-xs font-medium text-on-surface-variant">Header</div>
          <pre class="overflow-auto text-xs font-mono text-on-surface">{{ JSON.stringify(jwtParsed.header, null, 2) }}</pre>
        </div>
        <div class="rounded-xl bg-surface-variant/50 p-3">
          <div class="mb-1 text-xs font-medium text-on-surface-variant">Payload</div>
          <pre class="overflow-auto text-xs font-mono text-on-surface">{{ JSON.stringify(jwtParsed.payload, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Bcrypt -->
    <div v-if="tab === 'bcrypt'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <h3 class="text-lg font-medium text-on-surface">Bcrypt 哈希</h3>
      <input v-model="bcryptText" placeholder="输入密码" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <button @click="doBcryptHash" class="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-sm hover:bg-primary/90 transition-colors">
        计算哈希
      </button>
      <div v-if="bcryptHash" class="rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface break-all">
        {{ bcryptHash }}
        <button @click="copy(bcryptHash, 'bcrypt-hash')" class="ml-2 rounded-full p-1 hover:bg-surface-variant inline-flex align-middle">
          <Check v-if="copiedMap['bcrypt-hash']" class="h-4 w-4 text-primary" />
          <Copy v-else class="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>
      <div class="border-t border-outline-variant pt-4">
        <input v-model="bcryptCompare" placeholder="输入哈希值进行比对" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <div v-if="bcryptResult" class="mt-2 text-sm font-medium" :class="bcryptResult.startsWith('✅') ? 'text-green-600' : 'text-error'">
          {{ bcryptResult }}
        </div>
      </div>
    </div>

    <!-- SM4 -->
    <div v-if="tab === 'sm4'" class="rounded-2xl bg-surface p-6 shadow-sm outline outline-1 outline-outline-variant space-y-4">
      <h3 class="text-lg font-medium text-on-surface">SM4 国密对称加密</h3>
      <div class="flex gap-3">
        <div class="inline-flex rounded-full bg-surface-variant p-1">
          <button @click="sm4Mode = 'encrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm4Mode === 'encrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">加密</button>
          <button @click="sm4Mode = 'decrypt'" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm4Mode === 'decrypt' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'">解密</button>
        </div>
      </div>
      <input v-model="sm4Key" placeholder="16 字节密钥，如 1234567890abcdef" class="h-10 w-full rounded-lg border border-outline bg-transparent px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <textarea v-model="sm4Text" :placeholder="sm4Mode === 'encrypt' ? '输入明文' : '输入密文'" class="h-32 w-full resize-none rounded-xl border border-outline bg-surface p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <div v-if="sm4Result" class="rounded-xl bg-surface-variant/50 p-3 font-mono text-sm text-on-surface break-all">
        {{ sm4Result }}
        <button @click="copy(sm4Result, 'sm4')" class="ml-2 rounded-full p-1 hover:bg-surface-variant inline-flex align-middle">
          <Check v-if="copiedMap['sm4']" class="h-4 w-4 text-primary" />
          <Copy v-else class="h-4 w-4 text-on-surface-variant" />
        </button>
      </div>
    </div>
  </div>
</template>
