import { tools, type ToolDefinition } from '@/tools/registry'

const PRELOADED_TOOLS_KEY = 'web-tools:preloaded-tools'

interface PreloadedToolsState {
  appVersion: string
  tools: Record<string, PreloadedToolRecord>
}

type IdleScheduler = (callback: () => void) => void
export type PreloadToolResult = 'loaded' | 'failed' | 'skipped'

interface PreloadedToolRecord {
  at: number
  assets: boolean
}

interface PreloadToolOptions {
  includeAssets?: boolean
}

function createPreloadedToolsState(): PreloadedToolsState {
  return { appVersion: __APP_VERSION__, tools: {} }
}

export function getPreloadedToolsState(): PreloadedToolsState {
  if (typeof localStorage === 'undefined') return createPreloadedToolsState()

  try {
    const raw = localStorage.getItem(PRELOADED_TOOLS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      parsed.appVersion === __APP_VERSION__ &&
      parsed.tools &&
      typeof parsed.tools === 'object' &&
      !Array.isArray(parsed.tools)
    ) {
      return {
        appVersion: __APP_VERSION__,
        tools: normalizePreloadedToolRecords(parsed.tools),
      }
    }
  } catch {
    return createPreloadedToolsState()
  }

  return createPreloadedToolsState()
}

function normalizePreloadedToolRecords(value: unknown): Record<string, PreloadedToolRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value).flatMap(([name, record]) => {
      if (typeof record === 'number') {
        return [[name, { at: record, assets: false } satisfies PreloadedToolRecord]]
      }
      if (
        record &&
        typeof record === 'object' &&
        !Array.isArray(record) &&
        typeof (record as { at?: unknown }).at === 'number'
      ) {
        return [[name, {
          at: (record as { at: number }).at,
          assets: (record as { assets?: unknown }).assets === true,
        } satisfies PreloadedToolRecord]]
      }
      return []
    }),
  )
}

export function getPreloadedToolsStorageStatus() {
  if (typeof localStorage === 'undefined') return { appVersion: __APP_VERSION__, storedVersion: '', outdated: false }

  try {
    const raw = localStorage.getItem(PRELOADED_TOOLS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) {
      return { appVersion: __APP_VERSION__, storedVersion: 'legacy', outdated: parsed.length > 0 }
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.appVersion === 'string') {
      const count = parsed.tools && typeof parsed.tools === 'object' && !Array.isArray(parsed.tools)
        ? Object.keys(parsed.tools).length
        : 0
      return { appVersion: __APP_VERSION__, storedVersion: parsed.appVersion, outdated: parsed.appVersion !== __APP_VERSION__ && count > 0 }
    }
  } catch {
    return { appVersion: __APP_VERSION__, storedVersion: '', outdated: false }
  }

  return { appVersion: __APP_VERSION__, storedVersion: '', outdated: false }
}

export function getPreloadedToolNames() {
  return new Set(
    Object.entries(getPreloadedToolsState().tools)
      .filter(([, record]) => record.assets)
      .map(([name]) => name),
  )
}

function savePreloadedToolsState(state: PreloadedToolsState) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PRELOADED_TOOLS_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota/private-mode failures; preloading remains opportunistic.
  }
}

function createIdleScheduler(): IdleScheduler {
  if (typeof requestIdleCallback !== 'undefined') {
    return (callback) => requestIdleCallback(callback, { timeout: 3000 })
  }

  return (callback) => setTimeout(callback, 200)
}

function scheduleIdle() {
  const schedule = createIdleScheduler()
  return new Promise<void>((resolve) => schedule(resolve))
}

export async function preloadTool(tool: Pick<ToolDefinition, 'component' | 'preloadAssets'>, options: PreloadToolOptions = {}) {
  try {
    await tool.component()
    if (options.includeAssets) await tool.preloadAssets?.()
    return true
  } catch {
    // Preloading is opportunistic and must never affect tool usage.
    return false
  }
}

export async function preloadToolByNameNow(name: string, options: PreloadToolOptions = {}): Promise<PreloadToolResult> {
  const tool = tools.find((item) => item.name === name)
  if (!tool) return 'failed'

  const state = getPreloadedToolsState()
  const existing = state.tools[tool.name]
  if (existing && (!options.includeAssets || existing.assets)) return 'skipped'

  const ok = await preloadTool(tool, options)
  if (!ok) return 'failed'

  state.tools[tool.name] = {
    at: Date.now(),
    assets: existing?.assets === true || options.includeAssets === true,
  }
  savePreloadedToolsState(state)
  return 'loaded'
}

export function preloadToolByName(name: string) {
  const schedule = createIdleScheduler()
  schedule(() => { void preloadToolByNameNow(name) })
}

export async function preloadToolsByNamesInBackground(names: string[], maxCount = 6, options: PreloadToolOptions = {}) {
  const queue = [...new Set(names)].slice(0, maxCount)
  let loaded = 0
  let failed = 0
  let skipped = 0

  const failedNames: string[] = []

  for (const name of queue) {
    await scheduleIdle()
    const result = await preloadToolByNameNow(name, options)
    if (result === 'loaded') loaded++
    else if (result === 'failed') {
      failed++
      failedNames.push(name)
    } else skipped++
  }

  return { loaded, failed, skipped, failedNames }
}
