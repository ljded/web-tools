import { tools, type ToolDefinition } from '@/tools/registry'

const PRELOADED_TOOLS_KEY = 'web-tools:preloaded-tools'

type IdleScheduler = (callback: () => void) => void
let backgroundPreloadPromise: Promise<{ loaded: number; failed: number; skipped: number }> | null = null

function getPreloadedToolNames() {
  if (typeof localStorage === 'undefined') return new Set<string>()

  try {
    const raw = localStorage.getItem(PRELOADED_TOOLS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function savePreloadedToolNames(names: Set<string>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PRELOADED_TOOLS_KEY, JSON.stringify([...names]))
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

export async function preloadTool(tool: Pick<ToolDefinition, 'component'>) {
  try {
    await tool.component()
    return true
  } catch {
    // Preloading is opportunistic and must never affect tool usage.
    return false
  }
}

export function preloadToolByName(name: string) {
  const tool = tools.find((item) => item.name === name)
  if (!tool) return
  const schedule = createIdleScheduler()
  schedule(() => { void preloadTool(tool) })
}

export async function preloadAllToolsInBackground() {
  const preloadedToolNames = getPreloadedToolNames()
  let loaded = 0
  let failed = 0
  let skipped = 0

  for (const tool of tools) {
    if (preloadedToolNames.has(tool.name)) {
      skipped++
      continue
    }

    await scheduleIdle()
    const ok = await preloadTool(tool)
    if (ok) {
      loaded++
      preloadedToolNames.add(tool.name)
      savePreloadedToolNames(preloadedToolNames)
    } else {
      failed++
    }
  }

  return { loaded, failed, skipped }
}

export function startBackgroundPreloadAllTools() {
  backgroundPreloadPromise ??= preloadAllToolsInBackground()
  return backgroundPreloadPromise
}
