<script setup lang="ts">
import { onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePersistedRef } from '@/utils/persist'
import { useRouteQueryValue } from '@/utils/routeQuery'
import { useHistory } from '@/utils/history'
import { useLatestTask } from '@/composables'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import RsaWorker from '@/workers/rsa.worker?worker'
import CryptoWorker from '@/workers/crypto.worker?worker'
import { createWorkerPool } from '@/workers/pool'

type CryptoTab = 'aes' | 'sm2' | 'rsa' | 'jwt' | 'bcrypt' | 'sm4'

const { t } = useI18n()
const tab = usePersistedRef<CryptoTab>('web-tools:crypto:tab', 'aes')
useRouteQueryValue('tab', tab, ['aes', 'sm2', 'rsa', 'jwt', 'bcrypt', 'sm4'])
const rsaWorkerPool = createWorkerPool(() => new RsaWorker(), { size: 1 })
const cryptoWorkerPool = createWorkerPool(() => new CryptoWorker(), { size: 2 })
const MAX_TEXT_CRYPTO_CHARS = 100_000
const MAX_ASYMMETRIC_CHARS = 4_000
const latestAes = useLatestTask()
const latestSm2 = useLatestTask()
const latestRsa = useLatestTask()
const latestJwt = useLatestTask()
const latestBcrypt = useLatestTask()
const latestSm4 = useLatestTask()

onUnmounted(() => {
  clearComputeTimers()
  latestAes.cancel()
  latestSm2.cancel()
  latestRsa.cancel()
  latestJwt.cancel()
  latestBcrypt.cancel()
  latestSm4.cancel()
  rsaWorkerPool.terminate()
  cryptoWorkerPool.terminate()
})

function isTooLong(text: string, max: number) { return text.length > max }

function localizeCryptoMessage(message: string | undefined, fallback: string) {
  if (message === '__crypto_error:missing_public_key') return t('tools.crypto.enterPubKey')
  if (message === '__crypto_error:missing_private_key') return t('tools.crypto.enterPriKey')
  if (message === '__crypto_error:decrypt_failed') return t('tools.crypto.decryptFailed')
  if (message === '__crypto_error:signature_format') return t('tools.crypto.sigFormat')
  if (message === '__crypto_error:sm4_key_invalid') return t('tools.crypto.sm4KeyError')
  if (message === '__crypto_error:rsa_encrypt_failed') return t('tools.crypto.operationFailedWithAlgo', { algo: 'RSA' })
  if (message === '__crypto_error:rsa_decrypt_failed') return t('tools.crypto.decryptFailed')
  if (message?.startsWith('__crypto_error:')) return fallback
  return message || fallback
}

function localizeCryptoResult(result: string) {
  if (result === '__crypto_result:signature_verified') return t('tools.crypto.sigVerified')
  if (result === '__crypto_result:signature_failed') return t('tools.crypto.sigFailed')
  return result
}

function isCryptoErrorResult(result: string) {
  return result.startsWith('__crypto_error:')
}

const computeTimers = new Map<CryptoTab, ReturnType<typeof setTimeout>>()

function scheduleCompute(target: CryptoTab, fn: () => void | Promise<void>) {
  const existing = computeTimers.get(target)
  if (existing) clearTimeout(existing)
  computeTimers.set(target, setTimeout(() => {
    computeTimers.delete(target)
    void fn()
  }, 220))
}

function clearComputeTimers() {
  for (const timer of computeTimers.values()) clearTimeout(timer)
  computeTimers.clear()
}

// AES
const aesText = usePersistedRef('web-tools:crypto:aes-text', 'Hello World')
const aesKey = usePersistedRef('web-tools:crypto:aes-key', 'my-secret-key')
const aesMode = usePersistedRef<'encrypt' | 'decrypt'>('web-tools:crypto:aes-mode', 'encrypt')
const aesResult = ref(''), aesError = ref(''), aesLoading = ref(false)
const aesHistory = useHistory<{ text: string; key: string; mode: string }>('web-tools:crypto:history:aes', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0, 25)}${d.text.length > 25 ? '...' : ''}` })

function saveAesHistory() { if (!aesText.value.trim()) return; aesHistory.add({ text: aesText.value, key: aesKey.value, mode: aesMode.value }) }
function onAesHistorySelect(item: { data: { text: string; key: string; mode: string } }) { aesText.value = item.data.text; aesKey.value = item.data.key; aesMode.value = item.data.mode as any }

async function computeAes() {
  const isCurrent = latestAes.next()
  if (!aesText.value || !aesKey.value) { aesResult.value = ''; aesError.value = ''; aesLoading.value = false; return }
  if (isTooLong(aesText.value, MAX_TEXT_CRYPTO_CHARS)) { aesResult.value = ''; aesError.value = t('tools.crypto.inputTooLongSimple'); aesLoading.value = false; return }
  aesLoading.value = true; aesError.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { const result = await lease.send<string>({ type: 'aes', text: aesText.value, key: aesKey.value, mode: aesMode.value }); if (isCurrent()) { if (isCryptoErrorResult(result)) { aesError.value = localizeCryptoMessage(result, t('tools.crypto.operationFailedWithAlgo', { algo: 'AES' })); aesResult.value = '' } else { aesResult.value = result } } }
  catch (e: any) { if (isCurrent()) { aesError.value = localizeCryptoMessage(e?.message, t('tools.crypto.operationFailedWithAlgo', { algo: 'AES' })); aesResult.value = '' } }
  finally { if (isCurrent()) aesLoading.value = false; lease.release() }
}
watch([aesText, aesKey, aesMode], () => { if (tab.value === 'aes') scheduleCompute('aes', computeAes) })

// SM2
const sm2Text = usePersistedRef('web-tools:crypto:sm2-text', 'Hello SM2')
const sm2PubKey = usePersistedRef('web-tools:crypto:sm2-pub', '')
const sm2PriKey = usePersistedRef('web-tools:crypto:sm2-pri', '')
const sm2Mode = usePersistedRef<'encrypt' | 'decrypt' | 'sign' | 'verify'>('web-tools:crypto:sm2-mode', 'encrypt')
const sm2Result = ref(''), sm2Error = ref(''), sm2Loading = ref(false)
const sm2History = useHistory<{ text: string; mode: string }>('web-tools:crypto:history:sm2', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0, 25)}${d.text.length > 25 ? '...' : ''}` })

function saveSm2History() { if (!sm2Text.value.trim()) return; sm2History.add({ text: sm2Text.value, mode: sm2Mode.value }) }
function onSm2HistorySelect(item: { data: { text: string; mode: string } }) { sm2Text.value = item.data.text; sm2Mode.value = item.data.mode as any }

async function genSm2Keys() {
  const lease = await cryptoWorkerPool.acquire()
  try { const keys = await lease.send<{ pub: string; pri: string }>({ type: 'sm2-gen-keys' }); sm2PubKey.value = keys.pub; sm2PriKey.value = keys.pri }
  catch (e: any) { sm2Error.value = localizeCryptoMessage(e?.message, t('tools.crypto.generateFailed')) }
  finally { lease.release() }
}

async function computeSm2() {
  const isCurrent = latestSm2.next()
  if (!sm2Text.value) { sm2Result.value = ''; sm2Error.value = ''; sm2Loading.value = false; return }
  if (isTooLong(sm2Text.value, MAX_ASYMMETRIC_CHARS)) { sm2Result.value = ''; sm2Error.value = t('tools.crypto.inputTooLongSimple'); sm2Loading.value = false; return }
  sm2Loading.value = true; sm2Error.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { const result = await lease.send<string>({ type: 'sm2', text: sm2Text.value, pub: sm2PubKey.value, pri: sm2PriKey.value, mode: sm2Mode.value }); if (isCurrent()) { if (isCryptoErrorResult(result)) { sm2Error.value = localizeCryptoMessage(result, t('tools.crypto.operationFailedWithAlgo', { algo: 'SM2' })); sm2Result.value = '' } else { sm2Result.value = localizeCryptoResult(result) } } }
  catch (e: any) { if (isCurrent()) { sm2Error.value = localizeCryptoMessage(e?.message, t('tools.crypto.operationFailedWithAlgo', { algo: 'SM2' })); sm2Result.value = '' } }
  finally { if (isCurrent()) sm2Loading.value = false; lease.release() }
}
watch([sm2Text, sm2Mode], () => { if (tab.value === 'sm2') scheduleCompute('sm2', computeSm2) })

// RSA
const rsaText = usePersistedRef('web-tools:crypto:rsa-text', 'Hello RSA')
const rsaPubKey = usePersistedRef('web-tools:crypto:rsa-pub', '')
const rsaPriKey = usePersistedRef('web-tools:crypto:rsa-pri', '')
const rsaMode = usePersistedRef<'encrypt' | 'decrypt'>('web-tools:crypto:rsa-mode', 'encrypt')
const rsaResult = ref(''), rsaError = ref(''), rsaLoading = ref(false)
const rsaHistory = useHistory<{ text: string; mode: string }>('web-tools:crypto:history:rsa', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0, 25)}${d.text.length > 25 ? '...' : ''}` })

function saveRsaHistory() { if (!rsaText.value.trim()) return; rsaHistory.add({ text: rsaText.value, mode: rsaMode.value }) }
function onRsaHistorySelect(item: { data: { text: string; mode: string } }) { rsaText.value = item.data.text; rsaMode.value = item.data.mode as any }

async function genRsaKeys() {
  const lease = await rsaWorkerPool.acquire()
  try { const keys = await lease.send<{ pub: string; pri: string }>({ type: 'generate', size: 2048 }); rsaPubKey.value = keys.pub; rsaPriKey.value = keys.pri }
  catch (e: any) { rsaError.value = localizeCryptoMessage(e?.message, t('tools.crypto.generateFailed')) }
  finally { lease.release() }
}

async function computeRsa() {
  const isCurrent = latestRsa.next()
  if (!rsaText.value) { rsaResult.value = ''; rsaError.value = ''; rsaLoading.value = false; return }
  if (isTooLong(rsaText.value, MAX_ASYMMETRIC_CHARS)) { rsaResult.value = ''; rsaError.value = t('tools.crypto.inputTooLongSimple'); rsaLoading.value = false; return }
  rsaLoading.value = true; rsaError.value = ''
  const lease = await rsaWorkerPool.acquire()
  try { const result = await lease.send<string>({ type: 'crypt', text: rsaText.value, pub: rsaPubKey.value, pri: rsaPriKey.value, mode: rsaMode.value }); if (isCurrent()) rsaResult.value = result }
  catch (e: any) { if (isCurrent()) { rsaError.value = localizeCryptoMessage(e?.message, t('tools.crypto.operationFailedWithAlgo', { algo: 'RSA' })); rsaResult.value = '' } }
  finally { if (isCurrent()) rsaLoading.value = false; lease.release() }
}
watch([rsaText, rsaMode], () => { if (tab.value === 'rsa') scheduleCompute('rsa', computeRsa) })

// JWT
const jwtText = usePersistedRef('web-tools:crypto:jwt-text', 'Hello JWT')
const jwtSecret = usePersistedRef('web-tools:crypto:jwt-secret', 'my-jwt-secret')
const jwtResult = ref(''), jwtError = ref('')
const jwtMode = usePersistedRef<'encode' | 'decode'>('web-tools:crypto:jwt-mode', 'encode')
const jwtHistory = useHistory<{ text: string; secret: string; mode: string }>('web-tools:crypto:history:jwt', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0, 25)}${d.text.length > 25 ? '...' : ''}` })

function saveJwtHistory() { if (!jwtText.value.trim()) return; jwtHistory.add({ text: jwtText.value, secret: jwtSecret.value, mode: jwtMode.value }) }
function onJwtHistorySelect(item: { data: { text: string; secret: string; mode: string } }) { jwtText.value = item.data.text; jwtSecret.value = item.data.secret; jwtMode.value = item.data.mode as any }

async function computeJwt() {
  const isCurrent = latestJwt.next()
  if (!jwtText.value || !jwtSecret.value) { jwtResult.value = ''; jwtError.value = ''; return }
  jwtError.value = ''
  if (jwtMode.value === 'encode') {
    const lease = await cryptoWorkerPool.acquire()
    try { const result = await lease.send<string>({ type: 'jwt-sign', text: jwtText.value, secret: jwtSecret.value }); if (isCurrent()) jwtResult.value = result }
    catch (e: any) { if (isCurrent()) { jwtError.value = e?.message || t('tools.crypto.signFailed'); jwtResult.value = '' } }
    finally { lease.release() }
  } else {
    const lease = await cryptoWorkerPool.acquire()
    try { const result = JSON.stringify(await lease.send<any>({ type: 'jwt-verify', token: jwtText.value, secret: jwtSecret.value }), null, 2); if (isCurrent()) jwtResult.value = result }
    catch (e: any) { if (isCurrent()) { jwtError.value = e?.message || t('tools.crypto.verifyFailed'); jwtResult.value = '' } }
    finally { lease.release() }
  }
}
watch([jwtText, jwtSecret, jwtMode], () => { if (tab.value === 'jwt') scheduleCompute('jwt', computeJwt) })

// Bcrypt
const bcryptText = usePersistedRef('web-tools:crypto:bcrypt-text', 'MyPassword123')
const bcryptHash = ref(''), bcryptError = ref(''), bcryptLoading = ref(false)
const bcryptCompare = ref(''), bcryptResult = ref<'match' | 'mismatch' | 'verifyFailed' | ''>('')
const bcryptResultTitle = computed(() => {
  if (bcryptResult.value === 'match') return t('tools.crypto.passwordMatch')
  if (bcryptResult.value === 'mismatch') return t('tools.crypto.passwordMismatch')
  if (bcryptResult.value === 'verifyFailed') return t('tools.crypto.verifyFailed')
  return ''
})

async function computeBcrypt() {
  const isCurrent = latestBcrypt.next()
  if (!bcryptText.value) { bcryptHash.value = ''; bcryptError.value = ''; bcryptLoading.value = false; return }
  bcryptLoading.value = true; bcryptError.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { const result = await lease.send<string>({ type: 'bcrypt-hash', text: bcryptText.value }); if (isCurrent()) bcryptHash.value = result }
  catch (e: any) { if (isCurrent()) { bcryptError.value = localizeCryptoMessage(e?.message, t('tools.crypto.computeFailed')); bcryptHash.value = '' } }
  finally { if (isCurrent()) bcryptLoading.value = false; lease.release() }
}

async function verifyBcrypt() {
  if (!bcryptText.value || !bcryptCompare.value) return
  const lease = await cryptoWorkerPool.acquire()
  try {
    const ok = await lease.send<boolean>({ type: 'bcrypt-verify', text: bcryptText.value, hash: bcryptCompare.value })
    bcryptResult.value = ok ? 'match' : 'mismatch'
  }
  catch (e: any) { bcryptResult.value = 'verifyFailed' }
  finally { lease.release() }
}

// SM4
const sm4Text = usePersistedRef('web-tools:crypto:sm4-text', 'Hello SM4')
const sm4Key = usePersistedRef('web-tools:crypto:sm4-key', '1234567890abcdef')
const sm4Mode = usePersistedRef<'encrypt' | 'decrypt'>('web-tools:crypto:sm4-mode', 'encrypt')
const sm4Result = ref(''), sm4Error = ref('')
const sm4History = useHistory<{ text: string; key: string; mode: string }>('web-tools:crypto:history:sm4', { maxCount: 8, generateLabel: (d) => `[${d.mode}] ${d.text.slice(0, 25)}${d.text.length > 25 ? '...' : ''}` })

function saveSm4History() { if (!sm4Text.value.trim()) return; sm4History.add({ text: sm4Text.value, key: sm4Key.value, mode: sm4Mode.value }) }
function onSm4HistorySelect(item: { data: { text: string; key: string; mode: string } }) { sm4Text.value = item.data.text; sm4Key.value = item.data.key; sm4Mode.value = item.data.mode as any }

async function computeSm4() {
  const isCurrent = latestSm4.next()
  if (!sm4Text.value || !sm4Key.value) { sm4Result.value = ''; sm4Error.value = ''; return }
  if (isTooLong(sm4Text.value, MAX_TEXT_CRYPTO_CHARS)) { sm4Result.value = ''; sm4Error.value = t('tools.crypto.inputTooLongSimple'); return }
  sm4Error.value = ''
  const lease = await cryptoWorkerPool.acquire()
  try { const result = await lease.send<string>({ type: 'sm4', text: sm4Text.value, key: sm4Key.value, mode: sm4Mode.value }); if (isCurrent()) { if (isCryptoErrorResult(result)) { sm4Error.value = localizeCryptoMessage(result, t('tools.crypto.operationFailedWithAlgo', { algo: 'SM4' })); sm4Result.value = '' } else { sm4Result.value = result } } }
  catch (e: any) { if (isCurrent()) { sm4Error.value = localizeCryptoMessage(e?.message, t('tools.crypto.operationFailedWithAlgo', { algo: 'SM4' })); sm4Result.value = '' } }
  finally { lease.release() }
}
watch([sm4Text, sm4Key, sm4Mode], () => { if (tab.value === 'sm4') scheduleCompute('sm4', computeSm4) })

function computeActiveTab() {
  if (tab.value === 'aes') void computeAes()
  else if (tab.value === 'sm4') void computeSm4()
  else if (tab.value === 'sm2') void computeSm2()
  else if (tab.value === 'rsa') void computeRsa()
  else if (tab.value === 'jwt') void computeJwt()
}

watch(tab, () => computeActiveTab(), { immediate: true })

const tabsConfig = [
  { key: 'aes' as const, label: 'AES', icon: 'i-lucide-lock' },
  { key: 'sm4' as const, label: 'SM4', icon: 'i-lucide-file-key' },
  { key: 'rsa' as const, label: 'RSA', icon: 'i-lucide-key-round' },
  { key: 'sm2' as const, label: 'SM2', icon: 'i-lucide-shield-check' },
  { key: 'jwt' as const, label: 'JWT', icon: 'i-lucide-scan-line' },
  { key: 'bcrypt' as const, label: 'Bcrypt', icon: 'i-lucide-fingerprint' },
]
</script>

<template>
  <ToolPage name="crypto" max-width="6xl">
    <!-- Top-level tabs -->
    <UTabs
      v-model="tab"
      :items="tabsConfig.map(t => ({ label: t.label, value: t.key, icon: t.icon }))"
      color="primary"
      variant="pill"
      size="lg"
      class="justify-center"
    />

    <!-- AES -->
    <div v-if="tab === 'aes'" class="space-y-5">
      <ToolSection :title="$t('tools.crypto.aesTitle')" :description="$t('tools.crypto.aesDesc')">
        <template #actions>
          <HistoryPanel :items="aesHistory.items.value" @select="onAesHistorySelect" @remove="aesHistory.remove" @clear="aesHistory.clear" />
        </template>
        <UTabs
          v-model="aesMode"
          :items="[{ label: $t('tools.crypto.encrypt'), value: 'encrypt', icon: 'i-lucide-lock' }, { label: $t('tools.crypto.decrypt'), value: 'decrypt', icon: 'i-lucide-unlock' }]"
          color="primary"
        />
        <div class="mt-5 tool-workspace">
          <div class="space-y-5">
            <UFormField :label="$t('tools.crypto.key')">
              <UInput v-model="aesKey" :placeholder="$t('tools.crypto.aesKeyInputPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="aesMode === 'encrypt' ? $t('tools.crypto.plaintext') : $t('tools.crypto.ciphertext')">
              <UTextarea
                v-model="aesText"
                @blur="saveAesHistory"
                :placeholder="aesMode === 'encrypt' ? $t('tools.crypto.encryptInputPlaceholder') : $t('tools.crypto.decryptInputPlaceholder')"
                :rows="9"
                class="w-full"
              />
            </UFormField>
            <UAlert v-if="aesError" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="aesError" />
          </div>
          <div class="tool-preview-sticky">
            <ResultPanel :title="$t('app.result')" :value="aesResult" color="primary" max-height="420px" />
          </div>
        </div>
      </ToolSection>
    </div>

    <!-- SM4 -->
    <div v-if="tab === 'sm4'" class="space-y-5">
      <ToolSection :title="$t('tools.crypto.sm4Title')" :description="$t('tools.crypto.sm4Desc')">
        <template #actions>
          <HistoryPanel :items="sm4History.items.value" @select="onSm4HistorySelect" @remove="sm4History.remove" @clear="sm4History.clear" />
        </template>
        <UTabs
          v-model="sm4Mode"
          :items="[{ label: $t('tools.crypto.encrypt'), value: 'encrypt', icon: 'i-lucide-lock' }, { label: $t('tools.crypto.decrypt'), value: 'decrypt', icon: 'i-lucide-unlock' }]"
          color="primary"
        />
        <div class="mt-5 tool-workspace">
          <div class="space-y-5">
            <UFormField :label="$t('tools.crypto.key16Bytes')">
              <UInput v-model="sm4Key" :placeholder="$t('tools.crypto.sm4KeyExamplePlaceholder')" class="w-full font-mono" />
            </UFormField>
            <UFormField :label="sm4Mode === 'encrypt' ? $t('tools.crypto.plaintext') : $t('tools.crypto.ciphertext')">
              <UTextarea v-model="sm4Text" @blur="saveSm4History" :placeholder="sm4Mode === 'encrypt' ? $t('tools.crypto.encryptInputPlaceholder') : $t('tools.crypto.decryptInputPlaceholder')" :rows="9" class="w-full" />
            </UFormField>
            <UAlert v-if="sm4Error" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="sm4Error" />
          </div>
          <div class="tool-preview-sticky">
            <ResultPanel :title="$t('app.result')" :value="sm4Result" color="secondary" max-height="420px" />
          </div>
        </div>
      </ToolSection>
    </div>

    <!-- RSA -->
    <div v-if="tab === 'rsa'" class="space-y-5">
      <ToolSection :title="$t('tools.crypto.rsaTitle')" :description="$t('tools.crypto.rsaDesc')">
        <template #actions>
          <HistoryPanel :items="rsaHistory.items.value" @select="onRsaHistorySelect" @remove="rsaHistory.remove" @clear="rsaHistory.clear" />
        </template>
        <UTabs
          v-model="rsaMode"
          :items="[{ label: $t('tools.crypto.encrypt'), value: 'encrypt', icon: 'i-lucide-lock' }, { label: $t('tools.crypto.decrypt'), value: 'decrypt', icon: 'i-lucide-unlock' }]"
          color="primary"
        />
        <div class="mt-5 tool-workspace">
          <div class="space-y-5">
            <div class="flex items-center justify-between rounded-xl bg-warning/10 px-4 py-3">
              <span class="text-sm text-warning"><UIcon name="i-lucide-key-round" class="inline size-4" /> {{ $t('tools.crypto.keyPair') }}</span>
              <UButton color="warning" size="sm" icon="i-lucide-refresh-cw" @click="genRsaKeys" class="rounded-lg px-3 py-2 text-xs font-medium">{{ $t('tools.crypto.generateKeys') }}</UButton>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="$t('tools.crypto.publicKey')">
                <UTextarea v-model="rsaPubKey" :placeholder="$t('tools.crypto.pastePubKeyPlaceholder')" :rows="7" class="w-full font-mono text-xs" />
              </UFormField>
              <UFormField :label="$t('tools.crypto.privateKey')">
                <UTextarea v-model="rsaPriKey" :placeholder="$t('tools.crypto.pastePriKeyPlaceholder')" :rows="7" class="w-full font-mono text-xs" />
              </UFormField>
            </div>
            <UFormField :label="rsaMode === 'encrypt' ? $t('tools.crypto.plaintext') : $t('tools.crypto.ciphertext')">
              <UTextarea v-model="rsaText" @blur="saveRsaHistory" :placeholder="$t('tools.crypto.contentPlaceholder')" :rows="7" class="w-full" />
            </UFormField>
            <UAlert v-if="rsaError" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="rsaError" />
          </div>
          <div class="tool-preview-sticky">
            <ResultPanel :title="$t('app.result')" :value="rsaResult" color="primary" max-height="420px" />
          </div>
        </div>
      </ToolSection>
    </div>

    <!-- SM2 -->
    <div v-if="tab === 'sm2'" class="space-y-5">
      <ToolSection :title="$t('tools.crypto.sm2Title')" :description="$t('tools.crypto.sm2Desc')">
        <template #actions>
          <HistoryPanel :items="sm2History.items.value" @select="onSm2HistorySelect" @remove="sm2History.remove" @clear="sm2History.clear" />
        </template>
        <div class="mt-5 tool-workspace">
          <div class="space-y-5">
            <div class="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
              <span class="text-sm text-primary"><UIcon name="i-lucide-key-round" class="inline size-4" /> {{ $t('tools.crypto.keyPair') }}</span>
              <UButton color="primary" size="sm" icon="i-lucide-refresh-cw" @click="genSm2Keys" class="rounded-lg px-3 py-2 text-xs font-medium">{{ $t('tools.crypto.generateKeys') }}</UButton>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="$t('tools.crypto.publicKey')">
                <UTextarea v-model="sm2PubKey" :placeholder="$t('tools.crypto.pastePubKeyPlaceholder')" :rows="7" class="w-full font-mono text-xs" />
              </UFormField>
              <UFormField :label="$t('tools.crypto.privateKey')">
                <UTextarea v-model="sm2PriKey" :placeholder="$t('tools.crypto.pastePriKeyPlaceholder')" :rows="7" class="w-full font-mono text-xs" />
              </UFormField>
            </div>
            <UTabs
              v-model="sm2Mode"
              :items="[
                { label: $t('tools.crypto.encrypt'), value: 'encrypt', icon: 'i-lucide-lock' },
                { label: $t('tools.crypto.decrypt'), value: 'decrypt', icon: 'i-lucide-unlock' },
                { label: $t('tools.crypto.sign'), value: 'sign', icon: 'i-lucide-pen-line' },
                { label: $t('tools.crypto.verify'), value: 'verify', icon: 'i-lucide-shield-check' }
              ]"
              color="primary"
            />
            <UFormField :label="sm2Mode === 'encrypt' || sm2Mode === 'sign' ? $t('app.input') : $t('tools.crypto.ciphertextOrSignature')">
              <UTextarea v-model="sm2Text" @blur="saveSm2History" :placeholder="$t('tools.crypto.contentPlaceholder')" :rows="7" class="w-full" />
            </UFormField>
            <UAlert v-if="sm2Error" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="sm2Error" />
          </div>
          <div class="tool-preview-sticky">
            <ResultPanel :title="$t('app.result')" :value="sm2Result" color="primary" :copyable="!sm2Result.startsWith('✅') && !sm2Result.startsWith('❌')" max-height="420px" />
          </div>
        </div>
      </ToolSection>
    </div>

    <!-- JWT -->
    <div v-if="tab === 'jwt'" class="space-y-5">
      <ToolSection :title="$t('tools.crypto.jwtTitle')" :description="$t('tools.crypto.jwtDesc')">
        <template #actions>
          <HistoryPanel :items="jwtHistory.items.value" @select="onJwtHistorySelect" @remove="jwtHistory.remove" @clear="jwtHistory.clear" />
        </template>
        <UTabs
          v-model="jwtMode"
          :items="[{ label: $t('tools.crypto.encode'), value: 'encode', icon: 'i-lucide-lock' }, { label: $t('tools.crypto.decode'), value: 'decode', icon: 'i-lucide-unlock' }]"
          color="primary"
        />
        <div class="mt-5 tool-workspace">
          <div class="space-y-5">
            <UFormField :label="$t('tools.crypto.key')">
              <UInput v-model="jwtSecret" :placeholder="$t('tools.crypto.jwtSecretPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="jwtMode === 'encode' ? $t('tools.crypto.payloadJson') : $t('tools.crypto.token')">
              <UTextarea v-model="jwtText" @blur="saveJwtHistory" :placeholder="jwtMode === 'encode' ? $t('tools.crypto.jwtPayloadPlaceholder') : $t('tools.crypto.jwtTokenPlaceholder')" :rows="7" class="w-full" />
            </UFormField>
            <UAlert v-if="jwtError" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="jwtError" />
          </div>
          <div class="tool-preview-sticky">
            <ResultPanel :title="$t('app.result')" :value="jwtResult" color="primary" pre-wrap max-height="420px" />
          </div>
        </div>
      </ToolSection>
    </div>

    <!-- Bcrypt -->
    <div v-if="tab === 'bcrypt'" class="space-y-5">
      <ToolSection :title="$t('tools.crypto.bcryptTitle')" :description="$t('tools.crypto.bcryptDesc')">
        <div class="mt-5 tool-workspace">
          <div class="space-y-5">
            <UFormField :label="$t('tools.crypto.password')">
              <UInput v-model="bcryptText" :placeholder="$t('tools.crypto.passwordInputPlaceholder')" class="w-full" />
            </UFormField>
            <UButton color="primary" @click="computeBcrypt" :disabled="bcryptLoading" class="rounded-xl py-3">
              <template #leading><UIcon v-if="!bcryptLoading" name="i-lucide-sparkles" class="size-4" /></template>
              {{ bcryptLoading ? $t('app.computing') : $t('tools.crypto.hash') }}
            </UButton>
            <UAlert v-if="bcryptError" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="bcryptError" />
            <USeparator :label="$t('tools.crypto.bcryptVerify')" />
            <div class="space-y-3">
              <UFormField :label="$t('tools.crypto.hashValue')">
                <UInput v-model="bcryptCompare" :placeholder="$t('tools.crypto.compareHashPlaceholder')" class="w-full" />
              </UFormField>
              <UButton color="primary" @click="verifyBcrypt" class="rounded-xl">{{ $t('tools.crypto.bcryptVerify') }}</UButton>
            </div>
          </div>
          <div class="space-y-3 tool-preview-sticky">
            <ResultPanel :title="$t('tools.crypto.hashResultTitle')" :value="bcryptHash" color="success" max-height="260px" />
            <UAlert v-if="bcryptResult === 'match'" color="success" variant="subtle" icon="i-lucide-shield-check" :title="bcryptResultTitle" />
            <UAlert v-else-if="bcryptResult" color="error" variant="subtle" icon="i-lucide-alert-circle" :title="bcryptResultTitle" />
          </div>
        </div>
      </ToolSection>
    </div>
  </ToolPage>
</template>
