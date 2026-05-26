<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CopyBtn from '@/components/CopyBtn.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import ToolPage from '@/components/tool/ToolPage.vue'
import ToolSection from '@/components/tool/ToolSection.vue'
import { allowExternalFetchOnce } from '@/security/sameOriginNetwork'
import { useHistory } from '@/utils/history'
import { usePersistedRef } from '@/utils/persist'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
type BodyMode = 'none' | 'json' | 'text' | 'form'

interface KeyValueRow {
  id: string
  enabled: boolean
  key: string
  value: string
}

interface ResponseState {
  ok: boolean
  status: number
  statusText: string
  durationMs: number
  headers: Record<string, string>
  bodyText: string
  contentType: string
  size: number
  truncated: boolean
}

interface ApiDebugHistoryData extends Record<string, unknown> {
  method: HttpMethod
  url: string
  headerNames: string[]
  bodyKind: BodyMode
  bodyBytes: number
  status?: number
  durationMs?: number
}

const MAX_RESPONSE_CHARS = 200_000
const DEFAULT_TIMEOUT_MS = 20_000
const SENSITIVE_QUERY_KEYS = /(?:token|key|secret|password|passwd|auth|credential|session|cookie)/i

const { t } = useI18n()

const method = usePersistedRef<HttpMethod>('web-tools:api-debugger:method', 'GET')
const urlInput = usePersistedRef('web-tools:api-debugger:url', 'https://api.github.com/')
const queryRows = usePersistedRef<KeyValueRow[]>('web-tools:api-debugger:query', [createRow()])
const bodyMode = usePersistedRef<BodyMode>('web-tools:api-debugger:body-mode', 'none')
const timeoutMs = usePersistedRef('web-tools:api-debugger:timeout', DEFAULT_TIMEOUT_MS)
const headerRows = ref<KeyValueRow[]>([createRow()])
const formRows = ref<KeyValueRow[]>([createRow()])
const bodyText = ref('')
const response = ref<ResponseState | null>(null)
const errorMessage = ref('')
const loading = ref(false)
const activeConfigTab = ref<'query' | 'headers' | 'body'>('query')
const responseBodyMode = ref<'formatted' | 'raw'>('formatted')
const curlImportText = ref('')
const curlImportError = ref('')
const importCurlOpen = ref(false)

const methodItems: { label: HttpMethod; value: HttpMethod }[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' },
]

const bodyModeItems = computed(() => [
  { label: t('tools.apiDebugger.bodyModes.none'), value: 'none' },
  { label: t('tools.apiDebugger.bodyModes.json'), value: 'json' },
  { label: t('tools.apiDebugger.bodyModes.text'), value: 'text' },
  { label: t('tools.apiDebugger.bodyModes.form'), value: 'form' },
])

const canSendBody = computed(() => method.value !== 'GET' && method.value !== 'HEAD')
const responseSummary = computed(() => {
  if (!response.value) return ''
  return [
    `${t('tools.apiDebugger.status')}: ${response.value.status} ${response.value.statusText}`,
    `${t('tools.apiDebugger.duration')}: ${response.value.durationMs}ms`,
    `${t('tools.apiDebugger.size')}: ${response.value.size} B`,
    `${t('tools.apiDebugger.contentType')}: ${response.value.contentType || '-'}`,
    response.value.truncated ? t('tools.apiDebugger.truncated') : '',
  ].filter(Boolean).join('\n')
})
const responseHeadersText = computed(() => {
  if (!response.value) return ''
  return Object.entries(response.value.headers).map(([key, value]) => `${key}: ${value}`).join('\n')
})
const formattedResponseBody = computed(() => {
  const body = response.value?.bodyText ?? ''
  if (!body || responseBodyMode.value === 'raw') return body
  const contentType = response.value?.contentType.toLowerCase() ?? ''
  if (!contentType.includes('json')) return body
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
})
const responseBodyModeItems = computed(() => [
  { label: t('tools.apiDebugger.formatted'), value: 'formatted' },
  { label: t('tools.apiDebugger.raw'), value: 'raw' },
])
const curlText = computed(() => {
  try {
    return generateCurl()
  } catch {
    return ''
  }
})

const history = useHistory<ApiDebugHistoryData>('web-tools:api-debugger:history', {
  maxCount: 20,
  debounceMs: 0,
  generateLabel: (data) => `${data.method} ${data.url}`,
  equals: (a, b) => a.method === b.method && a.url === b.url && a.bodyKind === b.bodyKind,
})

function createRow(): KeyValueRow {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    enabled: true,
    key: '',
    value: '',
  }
}

function addRow(rows: KeyValueRow[]) {
  rows.push(createRow())
}

function removeRow(rows: KeyValueRow[], row: KeyValueRow) {
  const next = rows.filter((item) => item.id !== row.id)
  rows.splice(0, rows.length, ...(next.length ? next : [createRow()]))
}

function enabledRows(rows: KeyValueRow[]) {
  return rows.filter((row) => row.enabled && row.key.trim())
}

function parseTargetUrl(raw: string): URL {
  const input = raw.trim()
  if (!input) throw new Error(t('tools.apiDebugger.invalidUrl'))
  const url = new URL(input, window.location.href)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(t('tools.apiDebugger.invalidUrl'))
  return url
}

function buildQueryUrl(baseUrl: URL, rows: KeyValueRow[]): URL {
  const url = new URL(baseUrl.href)
  for (const row of enabledRows(rows)) {
    url.searchParams.append(row.key.trim(), row.value)
  }
  return url
}

function buildHeaders(rows: KeyValueRow[]): Headers {
  const headers = new Headers()
  for (const row of enabledRows(rows)) {
    headers.set(row.key.trim(), row.value)
  }
  return headers
}

function hasHeader(headers: Headers, name: string) {
  for (const key of headers.keys()) {
    if (key.toLowerCase() === name.toLowerCase()) return true
  }
  return false
}

function buildBody(mode: BodyMode, text: string, rows: KeyValueRow[], headers: Headers): BodyInit | undefined {
  if (!canSendBody.value || mode === 'none') return undefined

  if (mode === 'json') {
    const raw = text.trim()
    if (!raw) return undefined
    JSON.parse(raw)
    if (!hasHeader(headers, 'content-type')) headers.set('content-type', 'application/json')
    return raw
  }

  if (mode === 'text') {
    if (!hasHeader(headers, 'content-type')) headers.set('content-type', 'text/plain;charset=UTF-8')
    return text
  }

  const params = new URLSearchParams()
  for (const row of enabledRows(rows)) {
    params.append(row.key.trim(), row.value)
  }
  if (!hasHeader(headers, 'content-type')) headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
  return params
}

function byteLength(text: string) {
  return new TextEncoder().encode(text).length
}

async function readResponseBody(res: Response, durationMs: number): Promise<ResponseState> {
  const headers: Record<string, string> = {}
  res.headers.forEach((value, key) => { headers[key] = value })

  const contentType = res.headers.get('content-type') ?? ''
  if (method.value === 'HEAD') {
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      durationMs,
      headers,
      bodyText: '',
      contentType,
      size: 0,
      truncated: false,
    }
  }

  const text = await res.text()
  const truncated = text.length > MAX_RESPONSE_CHARS
  const bodyText = truncated ? text.slice(0, MAX_RESPONSE_CHARS) : text
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    durationMs,
    headers,
    bodyText,
    contentType,
    size: byteLength(text),
    truncated,
  }
}

function sanitizeUrlForHistory(url: URL): string {
  const safe = new URL(url.href)
  safe.searchParams.forEach((_, key) => {
    if (SENSITIVE_QUERY_KEYS.test(key)) safe.searchParams.set(key, '***')
  })
  return safe.href
}

function sanitizeHeaderNames(rows: KeyValueRow[]): string[] {
  return enabledRows(rows).map((row) => row.key.trim())
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function splitCommandLine(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: 'single' | 'double' | null = null
  let escaped = false

  for (const char of input.trim()) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && quote !== 'single') {
      escaped = true
      continue
    }
    if (char === "'" && quote !== 'double') {
      quote = quote === 'single' ? null : 'single'
      continue
    }
    if (char === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double'
      continue
    }
    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (escaped) current += '\\'
  if (current) tokens.push(current)
  return tokens
}

function rowsFromParams(params: URLSearchParams): KeyValueRow[] {
  const rows = Array.from(params.entries()).map(([key, value]) => ({ ...createRow(), key, value }))
  return rows.length ? rows : [createRow()]
}

function parseHeaderToken(value: string): KeyValueRow | null {
  const index = value.indexOf(':')
  if (index <= 0) return null
  return {
    ...createRow(),
    key: value.slice(0, index).trim(),
    value: value.slice(index + 1).trim(),
  }
}

function applyImportedCurl() {
  curlImportError.value = ''
  try {
    const tokens = splitCommandLine(curlImportText.value.replace(/\\\r?\n/g, ' '))
    if (!tokens.length || tokens[0]?.toLowerCase() !== 'curl') throw new Error(t('tools.apiDebugger.invalidCurl'))

    const importedHeaders: KeyValueRow[] = []
    let importedMethod: HttpMethod | '' = ''
    let importedBody = ''
    let importedUrl = ''

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i]
      const next = tokens[i + 1]
      if (!token) continue

      if ((token === '-X' || token === '--request') && next) {
        importedMethod = next.toUpperCase() as HttpMethod
        i++
      } else if ((token === '-H' || token === '--header') && next) {
        const row = parseHeaderToken(next)
        if (row) importedHeaders.push(row)
        i++
      } else if ((token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-urlencode') && next !== undefined) {
        importedBody = next
        if (!importedMethod) importedMethod = 'POST'
        i++
      } else if (token.startsWith('http://') || token.startsWith('https://')) {
        importedUrl = token
      }
    }

    const parsedUrl = parseTargetUrl(importedUrl)
    const importedQuery = rowsFromParams(parsedUrl.searchParams)
    parsedUrl.search = ''

    if (importedMethod && !methodItems.some((item) => item.value === importedMethod)) throw new Error(t('tools.apiDebugger.invalidCurl'))
    method.value = importedMethod || (importedBody ? 'POST' : 'GET')
    urlInput.value = parsedUrl.href
    queryRows.value = importedQuery
    headerRows.value = importedHeaders.length ? importedHeaders : [createRow()]

    if (importedBody) {
      bodyMode.value = importedBody.trim().startsWith('{') || importedBody.trim().startsWith('[') ? 'json' : 'text'
      bodyText.value = importedBody
      activeConfigTab.value = 'body'
    } else {
      bodyMode.value = 'none'
      bodyText.value = ''
      activeConfigTab.value = importedQuery.length > 1 || importedQuery[0]?.key ? 'query' : 'headers'
    }

    importCurlOpen.value = false
  } catch (err) {
    curlImportError.value = err instanceof Error ? err.message : t('tools.apiDebugger.invalidCurl')
  }
}

function duplicateRequest() {
  response.value = null
  errorMessage.value = ''
}

function generateCurl(): string {
  const targetUrl = buildQueryUrl(parseTargetUrl(urlInput.value), queryRows.value)
  const headers = buildHeaders(headerRows.value)
  const body = buildBody(bodyMode.value, bodyText.value, formRows.value, headers)
  const parts = ['curl', '-X', method.value, shellQuote(targetUrl.href)]

  headers.forEach((value, key) => {
    parts.push('-H', shellQuote(`${key}: ${value}`))
  })

  if (body !== undefined) {
    parts.push('--data-raw', shellQuote(body instanceof URLSearchParams ? body.toString() : String(body)))
  }

  return parts.join(' ')
}

function formatJsonBody() {
  try {
    bodyText.value = JSON.stringify(JSON.parse(bodyText.value), null, 2)
    errorMessage.value = ''
  } catch {
    errorMessage.value = t('tools.apiDebugger.invalidJson')
  }
}

function recordHistory(targetUrl: URL, responseState?: ResponseState) {
  const bodyKind = canSendBody.value ? bodyMode.value : 'none'
  const bodyBytes = bodyKind === 'json' || bodyKind === 'text'
    ? byteLength(bodyText.value)
    : bodyKind === 'form'
      ? byteLength(new URLSearchParams(enabledRows(formRows.value).map((row) => [row.key.trim(), row.value])).toString())
      : 0

  history.add({
    method: method.value,
    url: sanitizeUrlForHistory(targetUrl),
    headerNames: sanitizeHeaderNames(headerRows.value),
    bodyKind,
    bodyBytes,
    status: responseState?.status,
    durationMs: responseState?.durationMs,
  })
}

async function sendRequest() {
  errorMessage.value = ''
  response.value = null

  let targetUrl: URL
  let headers: Headers
  let body: BodyInit | undefined
  try {
    targetUrl = buildQueryUrl(parseTargetUrl(urlInput.value), queryRows.value)
    headers = buildHeaders(headerRows.value)
    body = buildBody(bodyMode.value, bodyText.value, formRows.value, headers)
  } catch (err) {
    errorMessage.value = err instanceof SyntaxError ? t('tools.apiDebugger.invalidJson') : err instanceof Error ? err.message : t('tools.apiDebugger.invalidUrl')
    return
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs.value) || DEFAULT_TIMEOUT_MS))
  const start = performance.now()
  loading.value = true

  try {
    allowExternalFetchOnce(targetUrl.href)
    const res = await fetch(targetUrl.href, {
      method: method.value,
      headers,
      body,
      signal: controller.signal,
    })
    const durationMs = Math.round(performance.now() - start)
    response.value = await readResponseBody(res, durationMs)
    recordHistory(targetUrl, response.value)
  } catch (err) {
    const durationMs = Math.round(performance.now() - start)
    if (err instanceof DOMException && err.name === 'AbortError') {
      errorMessage.value = t('tools.apiDebugger.timeout')
    } else {
      errorMessage.value = t('tools.apiDebugger.networkError')
    }
    recordHistory(targetUrl, { ok: false, status: 0, statusText: 'Failed', durationMs, headers: {}, bodyText: '', contentType: '', size: 0, truncated: false })
  } finally {
    window.clearTimeout(timeout)
    loading.value = false
  }
}

function clearResponse() {
  response.value = null
  errorMessage.value = ''
}

function onHistorySelect(item: { data?: ApiDebugHistoryData }) {
  if (!item.data) return
  method.value = item.data.method
  urlInput.value = item.data.url
  bodyMode.value = item.data.bodyKind
  headerRows.value = item.data.headerNames.length
    ? item.data.headerNames.map((key) => ({ ...createRow(), key, value: '' }))
    : [createRow()]
}
</script>

<template>
  <ToolPage name="apiDebugger" max-width="6xl" icon="i-lucide-send">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] xl:items-start">
      <ToolSection :title="$t('tools.apiDebugger.request')" :description="$t('tools.apiDebugger.desc')">
        <template #actions>
          <HistoryPanel
            :items="history.items.value"
            :title="$t('tools.apiDebugger.history')"
            @select="onHistorySelect"
            @remove="history.remove"
            @clear="history.clear"
          />
        </template>

        <div class="space-y-4">
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            :title="$t('tools.apiDebugger.browserDirectTitle')"
            :description="$t('tools.apiDebugger.corsNotice')"
          />

          <div class="grid grid-cols-1 gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-end">
            <UFormField :label="$t('tools.apiDebugger.method')">
              <USelect v-model="method" :items="methodItems" class="w-full" />
            </UFormField>
            <UFormField :label="$t('tools.apiDebugger.url')">
              <UInput v-model="urlInput" placeholder="https://api.example.com/v1/users" class="w-full font-mono" size="lg" />
            </UFormField>
            <UButton color="primary" icon="i-lucide-send" size="lg" class="rounded-2xl" :loading="loading" @click="sendRequest">
              {{ $t('tools.apiDebugger.send') }}
            </UButton>
          </div>

          <div class="flex flex-wrap items-end gap-2">
            <UFormField :label="$t('tools.apiDebugger.timeoutMs')" class="w-36">
              <UInput v-model="timeoutMs" type="number" min="1000" class="w-full" />
            </UFormField>
            <UModal v-model:open="importCurlOpen" :ui="{ content: 'max-w-2xl' }">
              <UButton color="neutral" variant="soft" icon="i-lucide-terminal" class="rounded-full">
                {{ $t('tools.apiDebugger.importCurl') }}
              </UButton>
              <template #content>
                <div class="space-y-4 p-4 md:p-6">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="text-lg font-bold text-highlighted">{{ $t('tools.apiDebugger.importCurl') }}</div>
                      <p class="mt-1 text-sm text-muted">{{ $t('tools.apiDebugger.importCurlDesc') }}</p>
                    </div>
                    <UButton color="neutral" variant="ghost" icon="i-lucide-x" class="rounded-full" @click="importCurlOpen = false" />
                  </div>
                  <UTextarea v-model="curlImportText" :rows="8" class="w-full font-mono" placeholder="curl -X POST https://api.example.com -H 'content-type: application/json' --data-raw '{...}'" />
                  <UAlert v-if="curlImportError" color="error" variant="soft" icon="i-lucide-circle-alert" :description="curlImportError" />
                  <div class="flex justify-end gap-2">
                    <UButton color="neutral" variant="ghost" @click="importCurlOpen = false">{{ $t('app.close') }}</UButton>
                    <UButton color="primary" icon="i-lucide-check" @click="applyImportedCurl">{{ $t('tools.apiDebugger.applyCurl') }}</UButton>
                  </div>
                </div>
              </template>
            </UModal>
            <CopyBtn :text="curlText" variant="button" :msg="$t('tools.apiDebugger.curlCopied')" />
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy-plus" class="rounded-full" @click="duplicateRequest">
              {{ $t('tools.apiDebugger.duplicate') }}
            </UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-eraser" class="rounded-full" @click="clearResponse">
              {{ $t('tools.apiDebugger.clear') }}
            </UButton>
          </div>

          <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-lucide-circle-alert" :description="errorMessage" />

          <UTabs
            v-model="activeConfigTab"
            :items="[
              { label: $t('tools.apiDebugger.queryParams'), value: 'query', icon: 'i-lucide-list-plus' },
              { label: $t('tools.apiDebugger.headers'), value: 'headers', icon: 'i-lucide-heading' },
              { label: $t('tools.apiDebugger.body'), value: 'body', icon: 'i-lucide-braces' },
            ]"
          />

          <div v-if="activeConfigTab === 'query'" class="tool-stage p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-default">{{ $t('tools.apiDebugger.queryParams') }}</div>
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" @click="addRow(queryRows)">
                {{ $t('tools.apiDebugger.addRow') }}
              </UButton>
            </div>
            <div class="space-y-2">
              <div v-for="row in queryRows" :key="row.id" class="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:grid-cols-[auto_1fr_1fr_auto]">
                <UCheckbox v-model="row.enabled" />
                <UInput v-model="row.key" :placeholder="$t('tools.apiDebugger.key')" class="font-mono" />
                <UInput v-model="row.value" :placeholder="$t('tools.apiDebugger.value')" class="col-start-2 font-mono md:col-start-auto" />
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="removeRow(queryRows, row)" />
              </div>
            </div>
          </div>

          <div v-else-if="activeConfigTab === 'headers'" class="tool-stage p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-default">{{ $t('tools.apiDebugger.headers') }}</div>
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" @click="addRow(headerRows)">
                {{ $t('tools.apiDebugger.addRow') }}
              </UButton>
            </div>
            <div class="space-y-2">
              <div v-for="row in headerRows" :key="row.id" class="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:grid-cols-[auto_1fr_1fr_auto]">
                <UCheckbox v-model="row.enabled" />
                <UInput v-model="row.key" :placeholder="$t('tools.apiDebugger.headerName')" class="font-mono" />
                <UInput v-model="row.value" :placeholder="$t('tools.apiDebugger.headerValue')" class="col-start-2 font-mono md:col-start-auto" type="password" />
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="removeRow(headerRows, row)" />
              </div>
            </div>
            <p class="mt-3 text-xs text-muted">{{ $t('tools.apiDebugger.sensitiveNotice') }}</p>
          </div>

          <div v-else class="tool-stage p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div class="text-sm font-semibold text-default">{{ $t('tools.apiDebugger.body') }}</div>
              <div class="flex flex-wrap items-center gap-2">
                <USelect v-model="bodyMode" :items="bodyModeItems" class="w-40" :disabled="!canSendBody" />
                <UButton v-if="bodyMode === 'json'" size="xs" color="neutral" variant="soft" icon="i-lucide-wand-sparkles" :disabled="!canSendBody" @click="formatJsonBody">
                  {{ $t('tools.apiDebugger.formatJson') }}
                </UButton>
              </div>
            </div>

            <UAlert v-if="!canSendBody" color="neutral" variant="soft" :description="$t('tools.apiDebugger.bodyDisabled')" />
            <UTextarea
              v-else-if="bodyMode === 'json' || bodyMode === 'text'"
              v-model="bodyText"
              :rows="8"
              class="w-full font-mono"
              :placeholder="bodyMode === 'json' ? '{\n  &quot;hello&quot;: &quot;world&quot;\n}' : $t('tools.apiDebugger.bodyPlaceholder')"
            />
            <div v-else-if="bodyMode === 'form'" class="space-y-2">
              <div v-for="row in formRows" :key="row.id" class="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:grid-cols-[auto_1fr_1fr_auto]">
                <UCheckbox v-model="row.enabled" />
                <UInput v-model="row.key" :placeholder="$t('tools.apiDebugger.key')" class="font-mono" />
                <UInput v-model="row.value" :placeholder="$t('tools.apiDebugger.value')" class="col-start-2 font-mono md:col-start-auto" />
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="removeRow(formRows, row)" />
              </div>
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" @click="addRow(formRows)">
                {{ $t('tools.apiDebugger.addRow') }}
              </UButton>
            </div>
            <div v-else class="rounded-xl border border-dashed border-default p-4 text-sm text-muted">
              {{ $t('tools.apiDebugger.noBody') }}
            </div>
          </div>
        </div>
      </ToolSection>

      <div class="space-y-4 xl:sticky xl:top-24">
        <ResultPanel
          :title="$t('tools.apiDebugger.response')"
          :value="responseSummary"
          :loading="loading"
          :error="errorMessage"
          :color="response ? (response.ok ? 'success' : 'error') : 'neutral'"
          pre-wrap
        />
        <ResultPanel
          :title="$t('tools.apiDebugger.generatedCurl')"
          :value="curlText"
          pre-wrap
          max-height="150px"
        />
        <ResultPanel
          :title="$t('tools.apiDebugger.responseHeaders')"
          :value="responseHeadersText"
          pre-wrap
          max-height="220px"
          compact
        />
      </div>
    </div>

    <div class="mt-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm font-semibold text-default">{{ $t('tools.apiDebugger.responseBody') }}</div>
        <UTabs v-model="responseBodyMode" :items="responseBodyModeItems" size="xs" color="primary" />
      </div>
      <ResultPanel
        :title="$t('tools.apiDebugger.responseBody')"
        :value="formattedResponseBody"
        pre-wrap
        max-height="420px"
      />
    </div>
  </ToolPage>
</template>
