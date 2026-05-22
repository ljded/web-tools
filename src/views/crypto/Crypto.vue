<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RefreshCw, Loader2, Lock, Unlock, KeyRound, FileKey, ShieldCheck, Signature, ScanLine, Fingerprint, Eye, Sparkles, AlertCircle } from '@lucide/vue'
import { usePersistedRef } from '@/utils/persist'
import { useHistory } from '@/utils/history'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolHeader from '@/components/ToolHeader.vue'
import ToolCard from '@/components/ToolCard.vue'
import ModeSwitch from '@/components/ModeSwitch.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import RsaWorker from '@/workers/rsa.worker?worker'
import CryptoWorker from '@/workers/crypto.worker?worker'
import { createWorkerPool } from '@/workers/pool'

const tab = usePersistedRef<'aes' | 'sm2' | 'rsa' | 'jwt' | 'bcrypt' | 'sm4'>('web-tools:crypto:tab', 'aes')
const rsaWorkerPool = createWorkerPool(() => new RsaWorker(), { size: 1 })
const cryptoWorkerPool = createWorkerPool(() => new CryptoWorker(), { size: 2 })
const MAX_TEXT_CRYPTO_CHARS = 100_000
const MAX_ASYMMETRIC_CHARS = 4_000
function isTooLong(text: string, max: number) { return text.length > max }

// AES
const aesText = usePersistedRef('web-tools:crypto:aes-text', 'Hello World')
const aesKey = usePersistedRef('web-tools:crypto:aes-key', 'my-secret-key')
const aesMode = usePersistedRef<'encrypt' | 'decrypt'>('web-tools:crypto:aes-mode', 'encrypt')
const aesResult = ref(''), aesError = ref(''), aesLoading = ref(false)
const aesHistory = useHistory<{ text: string; key: string; mode: string }>('web-tools:crypto:history:aes', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0,25)}${d.text.length>25?'...':''}` })
function saveAesHistory() { if (!aesText.value.trim()) return; aesHistory.add({ text: aesText.value, key: aesKey.value, mode: aesMode.value }) }
function onAesHistorySelect(item: { data: { text: string; key: string; mode: string } }) { aesText.value = item.data.text; aesKey.value = item.data.key; aesMode.value = item.data.mode as any }
async function computeAes() {
  if (!aesText.value || !aesKey.value) { aesResult.value = ''; aesError.value = ''; return }
  if (isTooLong(aesText.value, MAX_TEXT_CRYPTO_CHARS)) { aesResult.value = ''; aesError.value = '输入过长'; return }
  aesLoading.value = true; aesError.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { aesResult.value = await lease.send<string>({ type: 'aes', text: aesText.value, key: aesKey.value, mode: aesMode.value }) }
  catch (e: any) { aesError.value = e?.message || 'AES 操作失败'; aesResult.value = '' }
  finally { aesLoading.value = false; lease.release() }
}
watch([aesText, aesKey, aesMode], () => computeAes(), { immediate: true })

// SM2
const sm2Text = usePersistedRef('web-tools:crypto:sm2-text', 'Hello SM2')
const sm2PubKey = usePersistedRef('web-tools:crypto:sm2-pub', '')
const sm2PriKey = usePersistedRef('web-tools:crypto:sm2-pri', '')
const sm2Mode = usePersistedRef<'encrypt' | 'decrypt' | 'sign' | 'verify'>('web-tools:crypto:sm2-mode', 'encrypt')
const sm2Result = ref(''), sm2Error = ref(''), sm2Loading = ref(false)
const sm2History = useHistory<{ text: string; mode: string }>('web-tools:crypto:history:sm2', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0,25)}${d.text.length>25?'...':''}` })
function saveSm2History() { if (!sm2Text.value.trim()) return; sm2History.add({ text: sm2Text.value, mode: sm2Mode.value }) }
function onSm2HistorySelect(item: { data: { text: string; mode: string } }) { sm2Text.value = item.data.text; sm2Mode.value = item.data.mode as any }
async function computeSm2() {
  if (!sm2Text.value) { sm2Result.value = ''; sm2Error.value = ''; return }
  if (isTooLong(sm2Text.value, MAX_ASYMMETRIC_CHARS)) { sm2Result.value = ''; sm2Error.value = '输入过长'; return }
  sm2Loading.value = true; sm2Error.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { sm2Result.value = await lease.send<string>({ type: 'sm2', text: sm2Text.value, mode: sm2Mode.value, pubKey: sm2PubKey.value, priKey: sm2PriKey.value }) }
  catch (e: any) { sm2Error.value = e?.message || 'SM2 操作失败'; sm2Result.value = '' }
  finally { sm2Loading.value = false; lease.release() }
}
watch([sm2Text, sm2PubKey, sm2PriKey, sm2Mode], () => computeSm2(), { immediate: true })
async function genSm2Keys() { const lease = await cryptoWorkerPool.acquire(); try { const keys = await lease.send<{ publicKey: string; privateKey: string }>({ type: 'sm2-gen-keys' }); sm2PubKey.value = keys.publicKey; sm2PriKey.value = keys.privateKey } finally { lease.release() } }

// RSA
const rsaText = usePersistedRef('web-tools:crypto:rsa-text', 'Hello RSA')
const rsaPubKey = usePersistedRef('web-tools:crypto:rsa-pub', '')
const rsaPriKey = usePersistedRef('web-tools:crypto:rsa-pri', '')
const rsaMode = usePersistedRef<'encrypt' | 'decrypt'>('web-tools:crypto:rsa-mode', 'encrypt')
const rsaGenLoading = ref(false), rsaResult = ref(''), rsaError = ref(''), rsaLoading = ref(false)
const rsaHistory = useHistory<{ text: string; mode: string }>('web-tools:crypto:history:rsa', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0,25)}${d.text.length>25?'...':''}` })
function saveRsaHistory() { if (!rsaText.value.trim()) return; rsaHistory.add({ text: rsaText.value, mode: rsaMode.value }) }
function onRsaHistorySelect(item: { data: { text: string; mode: string } }) { rsaText.value = item.data.text; rsaMode.value = item.data.mode as any }
async function computeRsa() {
  if (!rsaText.value) { rsaResult.value = ''; rsaError.value = ''; return }
  if (isTooLong(rsaText.value, MAX_ASYMMETRIC_CHARS)) { rsaResult.value = ''; rsaError.value = '输入过长'; return }
  rsaLoading.value = true; rsaError.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { rsaResult.value = await lease.send<string>({ type: 'rsa', text: rsaText.value, mode: rsaMode.value, pubKey: rsaPubKey.value, priKey: rsaPriKey.value }) }
  catch (e: any) { rsaError.value = e?.message || 'RSA 操作失败'; rsaResult.value = '' }
  finally { rsaLoading.value = false; lease.release() }
}
watch([rsaText, rsaPubKey, rsaPriKey, rsaMode], () => computeRsa(), { immediate: true })
async function genRsaKeys() { if (rsaGenLoading.value) return; rsaGenLoading.value = true; const lease = await rsaWorkerPool.acquire(); try { const result = await lease.send<{ publicKey: string; privateKey: string }>({ type: 'generate', size: 2048 }); rsaPubKey.value = result.publicKey; rsaPriKey.value = result.privateKey } finally { rsaGenLoading.value = false; lease.release() } }

// JWT
const jwtToken = usePersistedRef('web-tools:crypto:jwt-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
const jwtParsed = computed(() => {
  try {
    const parts = jwtToken.value.split('.'); if (parts.length !== 3) throw new Error('格式错误')
    return { header: JSON.parse(atob(parts[0]!.replace(/-/g,'+').replace(/_/g,'/'))), payload: JSON.parse(atob(parts[1]!.replace(/-/g,'+').replace(/_/g,'/'))) }
  } catch (e: any) { return { error: e.message || '解析失败' } }
})
const jwtHistory = useHistory<{ token: string }>('web-tools:crypto:history:jwt', { maxCount: 8, generateLabel: (d) => d.token.slice(0,30) + (d.token.length>30?'...':'') })
function saveJwtHistory() { if (!jwtToken.value.trim()) return; jwtHistory.add({ token: jwtToken.value }) }
function onJwtHistorySelect(item: { data: { token: string } }) { jwtToken.value = item.data.token }

// Bcrypt
const bcryptText = usePersistedRef('web-tools:crypto:bcrypt-text', '')
const bcryptHash = ref(''), bcryptLoading = ref(false), bcryptError = ref('')
const bcryptCompare = usePersistedRef('web-tools:crypto:bcrypt-compare', '')
const bcryptResult = ref('')
const bcryptHistory = useHistory<{ text: string }>('web-tools:crypto:history:bcrypt', { maxCount: 8, generateLabel: (d) => d.text.slice(0,25)+(d.text.length>25?'...':'') })
function saveBcryptHistory() { if (!bcryptText.value.trim()) return; bcryptHistory.add({ text: bcryptText.value }) }
function onBcryptHistorySelect(item: { data: { text: string } }) { bcryptText.value = item.data.text }
async function doBcryptHash() {
  if (!bcryptText.value) return
  bcryptLoading.value = true; bcryptError.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { const result = await lease.send<{ hash: string; compare: string }>({ type: 'bcrypt', text: bcryptText.value, compareHash: bcryptCompare.value }); bcryptHash.value = result.hash; bcryptResult.value = result.compare || '' }
  catch (e: any) { bcryptError.value = e?.message || 'Bcrypt 操作失败'; bcryptHash.value = '' }
  finally { bcryptLoading.value = false; lease.release() }
}
watch([bcryptCompare], () => { if (bcryptHash.value && bcryptCompare.value) doBcryptHash() })

// SM4
const sm4Text = usePersistedRef('web-tools:crypto:sm4-text', 'Hello SM4')
const sm4Key = usePersistedRef('web-tools:crypto:sm4-key', '1234567890abcdef')
const sm4Mode = usePersistedRef<'encrypt' | 'decrypt'>('web-tools:crypto:sm4-mode', 'encrypt')
const sm4Result = ref(''), sm4Error = ref(''), sm4Loading = ref(false)
const sm4History = useHistory<{ text: string; key: string; mode: string }>('web-tools:crypto:history:sm4', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0,25)}${d.text.length>25?'...':''}` })
function saveSm4History() { if (!sm4Text.value.trim()) return; sm4History.add({ text: sm4Text.value, key: sm4Key.value, mode: sm4Mode.value }) }
function onSm4HistorySelect(item: { data: { text: string; key: string; mode: string } }) { sm4Text.value = item.data.text; sm4Key.value = item.data.key; sm4Mode.value = item.data.mode as any }
async function computeSm4() {
  if (!sm4Text.value || !sm4Key.value) { sm4Result.value = ''; sm4Error.value = ''; return }
  if (isTooLong(sm4Text.value, MAX_TEXT_CRYPTO_CHARS)) { sm4Result.value = ''; sm4Error.value = '输入过长'; return }
  sm4Loading.value = true; sm4Error.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { sm4Result.value = await lease.send<string>({ type: 'sm4', text: sm4Text.value, key: sm4Key.value, mode: sm4Mode.value }) }
  catch (e: any) { sm4Error.value = e?.message || 'SM4 操作失败'; sm4Result.value = '' }
  finally { sm4Loading.value = false; lease.release() }
}
watch([sm4Text, sm4Key, sm4Mode], () => computeSm4(), { immediate: true })

const tabsConfig = [
  { key: 'aes' as const, label: 'AES', icon: Lock },
  { key: 'sm4' as const, label: 'SM4', icon: FileKey },
  { key: 'rsa' as const, label: 'RSA', icon: KeyRound },
  { key: 'sm2' as const, label: 'SM2', icon: ShieldCheck },
  { key: 'jwt' as const, label: 'JWT', icon: ScanLine },
  { key: 'bcrypt' as const, label: 'Bcrypt', icon: Fingerprint },
]
</script>

<template>
  <ToolLayout max-width="4xl">
    <div class="flex justify-center">
      <div class="inline-flex items-center gap-1 rounded-2xl bg-surface p-1.5 shadow-sm outline outline-1 outline-outline-variant">
        <UButton v-for="t in tabsConfig" :key="t.key" variant="ghost" color="neutral" @click="tab = t.key" class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200" :class="tab === t.key ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface'">
          <component :is="t.icon" class="h-4 w-4" /> {{ t.label }}
        </UButton>
      </div>
    </div>

    <!-- AES -->
    <div v-if="tab === 'aes'" class="space-y-5">
      <div class="flex items-center justify-between">
        <ToolHeader title="AES 加解密" description="高级加密标准，对称加密算法" :icon="Lock" />
        <HistoryPanel :items="aesHistory.items.value" @select="onAesHistorySelect" @remove="aesHistory.remove" @clear="aesHistory.clear" />
      </div>
      <ToolCard>
        <ModeSwitch v-model="aesMode" :options="[{ value: 'encrypt', label: '加密', icon: Lock }, { value: 'decrypt', label: '解密', icon: Unlock }]" />
        <div class="space-y-5 p-6">
          <div class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><KeyRound class="h-3.5 w-3.5" /> 密钥</label>
            <UInput v-model="aesKey" placeholder="输入加密密钥..." class="h-11 w-full" />
          </div>
          <div class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><FileKey class="h-3.5 w-3.5" /> {{ aesMode === 'encrypt' ? '明文' : '密文' }}</label>
            <UTextarea v-model="aesText" @blur="saveAesHistory" :placeholder="aesMode === 'encrypt' ? '输入要加密的内容...' : '输入要解密的内容...'" :rows="9" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-sm w-full" />
          </div>
          <div v-if="aesError" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container"><AlertCircle class="h-4 w-4 shrink-0" /> {{ aesError }}</div>
          <div v-if="aesResult" class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><Sparkles class="h-3.5 w-3.5" /> 结果</label>
            <div class="group relative">
              <div class="break-all rounded-xl bg-primary-container/40 p-4 font-mono text-sm text-on-primary-container">{{ aesResult }}</div>
              <CopyBtn :text="aesResult" class="absolute right-3 top-3 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </ToolCard>
    </div>

    <!-- SM2 -->
    <div v-if="tab === 'sm2'" class="space-y-5">
      <div class="flex items-center justify-between">
        <ToolHeader title="SM2 国密非对称" description="国产椭圆曲线密码算法" :icon="ShieldCheck" />
        <HistoryPanel :items="sm2History.items.value" @select="onSm2HistorySelect" @remove="sm2History.remove" @clear="sm2History.clear" />
      </div>
      <ToolCard>
        <div class="flex items-center justify-between rounded-xl bg-primary-container/30 px-4 py-3">
          <div class="flex items-center gap-2 text-sm text-on-primary-container"><KeyRound class="h-4 w-4" /><span>密钥对</span></div>
          <UButton variant="solid" color="primary" size="sm" @click="genSm2Keys" class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm"><RefreshCw class="h-3.5 w-3.5" /> 生成密钥对</UButton>
        </div>
        <div class="space-y-5 p-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">公钥</label>
              <UTextarea v-model="sm2PubKey" placeholder="粘贴公钥..." :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-3 text-xs font-mono w-full" />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">私钥</label>
              <UTextarea v-model="sm2PriKey" placeholder="粘贴私钥..." :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-3 text-xs font-mono w-full" />
            </div>
          </div>
          <div class="flex gap-2">
            <UButton v-for="m in [{ key: 'encrypt' as const, label: '加密', icon: Lock }, { key: 'decrypt' as const, label: '解密', icon: Unlock }, { key: 'sign' as const, label: '签名', icon: Signature }, { key: 'verify' as const, label: '验签', icon: ShieldCheck }]" :key="m.key" variant="ghost" color="neutral" @click="sm2Mode = m.key" class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors" :class="sm2Mode === m.key ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant'">
              <component :is="m.icon" class="mr-1 h-3.5 w-3.5" />{{ m.label }}
            </UButton>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{{ sm2Mode === 'encrypt' || sm2Mode === 'sign' ? '输入' : '密文/签名值' }}</label>
            <UTextarea v-model="sm2Text" @blur="saveSm2History" placeholder="输入内容..." :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-sm w-full" />
          </div>
          <div v-if="sm2Error" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container"><AlertCircle class="h-4 w-4 shrink-0" /> {{ sm2Error }}</div>
          <div v-if="sm2Result" class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">结果</label>
            <div class="group relative">
              <div class="break-all rounded-xl bg-primary-container/40 p-4 font-mono text-sm text-on-primary-container">{{ sm2Result }}</div>
              <CopyBtn v-if="!sm2Result.startsWith('✅') && !sm2Result.startsWith('❌')" :text="sm2Result" class="absolute right-3 top-3 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </ToolCard>
    </div>

    <!-- RSA -->
    <div v-if="tab === 'rsa'" class="space-y-5">
      <div class="flex items-center justify-between">
        <ToolHeader title="RSA 加解密" description="非对称加密算法，支持 2048 位密钥" :icon="KeyRound" />
        <HistoryPanel :items="rsaHistory.items.value" @select="onRsaHistorySelect" @remove="rsaHistory.remove" @clear="rsaHistory.clear" />
      </div>
      <ToolCard>
        <ModeSwitch v-model="rsaMode" :options="[{ value: 'encrypt', label: '加密', icon: Lock }, { value: 'decrypt', label: '解密', icon: Unlock }]" color="tertiary" />
        <div class="space-y-5 p-6">
          <div class="flex items-center justify-between rounded-xl bg-tertiary-container/30 px-4 py-3">
            <div class="flex items-center gap-2 text-sm text-on-tertiary-container"><KeyRound class="h-4 w-4" /><span>密钥对</span></div>
            <UButton variant="solid" color="tertiary" size="sm" @click="genRsaKeys" :disabled="rsaGenLoading" class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm"><Loader2 v-if="rsaGenLoading" class="h-3.5 w-3.5 animate-spin" /><RefreshCw v-else class="h-3.5 w-3.5" /> {{ rsaGenLoading ? '生成中...' : '生成 2048 位密钥' }}</UButton>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">公钥</label>
              <UTextarea v-model="rsaPubKey" placeholder="粘贴公钥..." :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-3 text-xs font-mono w-full" />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">私钥</label>
              <UTextarea v-model="rsaPriKey" placeholder="粘贴私钥..." :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-3 text-xs font-mono w-full" />
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{{ rsaMode === 'encrypt' ? '明文' : '密文' }}</label>
            <UTextarea v-model="rsaText" @blur="saveRsaHistory" :placeholder="rsaMode === 'encrypt' ? '输入要加密的内容...' : '输入要解密的内容...'" :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-sm w-full" />
          </div>
          <div v-if="rsaError" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container"><AlertCircle class="h-4 w-4 shrink-0" /> {{ rsaError }}</div>
          <div v-if="rsaResult" class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">结果</label>
            <div class="group relative">
              <div class="break-all rounded-xl bg-tertiary-container/40 p-4 font-mono text-sm text-on-tertiary-container">{{ rsaResult }}</div>
              <CopyBtn :text="rsaResult" class="absolute right-3 top-3 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </ToolCard>
    </div>

    <!-- JWT -->
    <div v-if="tab === 'jwt'" class="space-y-5">
      <div class="flex items-center justify-between">
        <ToolHeader title="JWT 解析" description="JSON Web Token 解码与验证" :icon="ScanLine" />
        <HistoryPanel :items="jwtHistory.items.value" @select="onJwtHistorySelect" @remove="jwtHistory.remove" @clear="jwtHistory.clear" />
      </div>
      <ToolCard>
        <div class="space-y-5 p-6">
          <div class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><ScanLine class="h-3.5 w-3.5" /> Token</label>
            <UTextarea v-model="jwtToken" @blur="saveJwtHistory" placeholder="粘贴 JWT Token..." :rows="7" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-xs font-mono w-full" />
          </div>
          <div v-if="'error' in jwtParsed" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container"><AlertCircle class="h-4 w-4 shrink-0" /> {{ jwtParsed.error }}</div>
          <div v-else class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><Eye class="h-3.5 w-3.5" /> Header</label>
              <div class="overflow-auto rounded-xl bg-primary-container/30 p-4"><pre class="text-xs font-mono text-on-primary-container">{{ JSON.stringify(jwtParsed.header, null, 2) }}</pre></div>
            </div>
            <div class="space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><FileKey class="h-3.5 w-3.5" /> Payload</label>
              <div class="overflow-auto rounded-xl bg-secondary-container/30 p-4"><pre class="text-xs font-mono text-on-secondary-container">{{ JSON.stringify(jwtParsed.payload, null, 2) }}</pre></div>
            </div>
          </div>
        </div>
      </ToolCard>
    </div>

    <!-- Bcrypt -->
    <div v-if="tab === 'bcrypt'" class="space-y-5">
      <div class="flex items-center justify-between">
        <ToolHeader title="Bcrypt 哈希" description="安全密码哈希与验证" :icon="Fingerprint" />
        <HistoryPanel :items="bcryptHistory.items.value" @select="onBcryptHistorySelect" @remove="bcryptHistory.remove" @clear="bcryptHistory.clear" />
      </div>
      <ToolCard>
        <div class="space-y-5 p-6">
          <div class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><Lock class="h-3.5 w-3.5" /> 密码</label>
            <UInput v-model="bcryptText" @blur="saveBcryptHistory" placeholder="输入密码..." class="h-11 w-full" />
          </div>
          <UButton variant="solid" color="success" block @click="doBcryptHash" :disabled="bcryptLoading" class="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium shadow-sm"><Loader2 v-if="bcryptLoading" class="h-4 w-4 animate-spin" /><Sparkles v-else class="h-4 w-4" /> {{ bcryptLoading ? '计算中...' : '计算哈希' }}</UButton>
          <div v-if="bcryptHash" class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">哈希结果</label>
            <div class="group relative">
              <div class="break-all rounded-xl bg-success-container/40 p-4 font-mono text-sm text-on-success-container">{{ bcryptHash }}</div>
              <CopyBtn :text="bcryptHash" class="absolute right-3 top-3 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
          <div class="flex items-center gap-3"><div class="h-px flex-1 bg-outline-variant" /><span class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">验证</span><div class="h-px flex-1 bg-outline-variant" /></div>
          <div class="space-y-3">
            <div class="space-y-2">
              <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">哈希值</label>
              <UInput v-model="bcryptCompare" placeholder="输入哈希值进行比对..." class="h-11 w-full" />
            </div>
            <div v-if="bcryptResult" class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium" :class="bcryptResult === '密码匹配' ? 'bg-success-container/60 text-on-success-container' : 'bg-error-container/60 text-on-error-container'"><ShieldCheck v-if="bcryptResult === '密码匹配'" class="h-4 w-4" /><AlertCircle v-else class="h-4 w-4" /> {{ bcryptResult }}</div>
          </div>
        </div>
      </ToolCard>
    </div>

    <!-- SM4 -->
    <div v-if="tab === 'sm4'" class="space-y-5">
      <div class="flex items-center justify-between">
        <ToolHeader title="SM4 国密对称加密" description="国产分组密码算法" :icon="FileKey" />
        <HistoryPanel :items="sm4History.items.value" @select="onSm4HistorySelect" @remove="sm4History.remove" @clear="sm4History.clear" />
      </div>
      <ToolCard>
        <ModeSwitch v-model="sm4Mode" :options="[{ value: 'encrypt', label: '加密', icon: Lock }, { value: 'decrypt', label: '解密', icon: Unlock }]" color="secondary" />
        <div class="space-y-5 p-6">
          <div class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><KeyRound class="h-3.5 w-3.5" /> 密钥 (16 字节)</label>
            <UInput v-model="sm4Key" placeholder="如：1234567890abcdef" class="h-11 w-full font-mono" />
          </div>
          <div class="space-y-2">
            <label class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-on-surface-variant"><FileKey class="h-3.5 w-3.5" /> {{ sm4Mode === 'encrypt' ? '明文' : '密文' }}</label>
            <UTextarea v-model="sm4Text" @blur="saveSm4History" :placeholder="sm4Mode === 'encrypt' ? '输入要加密的内容...' : '输入要解密的内容...'" :rows="9" class="resize-none rounded-xl border border-outline bg-surface-variant/40 p-4 text-sm w-full" />
          </div>
          <div v-if="sm4Error" class="flex items-center gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-sm text-on-error-container"><AlertCircle class="h-4 w-4 shrink-0" /> {{ sm4Error }}</div>
          <div v-if="sm4Result" class="space-y-2">
            <label class="text-xs font-medium uppercase tracking-wider text-on-surface-variant">结果</label>
            <div class="group relative">
              <div class="break-all rounded-xl bg-secondary-container/40 p-4 font-mono text-sm text-on-secondary-container">{{ sm4Result }}</div>
              <CopyBtn :text="sm4Result" class="absolute right-3 top-3 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </ToolCard>
    </div>
  </ToolLayout>
</template>