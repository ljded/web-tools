import { tools, type ToolDefinition } from '@/tools/registry'

type IdleScheduler = (callback: () => void) => void

function createIdleScheduler(): IdleScheduler {
  if (typeof requestIdleCallback !== 'undefined') {
    return (callback) => requestIdleCallback(callback, { timeout: 3000 })
  }

  return (callback) => setTimeout(callback, 200)
}

export function preloadTool(tool: Pick<ToolDefinition, 'component'>) {
  try {
    void tool.component()
  } catch {
    // Preloading is opportunistic and must never affect tool usage.
  }
}

export function preloadAllTools() {
  const schedule = createIdleScheduler()
  schedule(() => {
    for (const tool of tools) {
      schedule(() => preloadTool(tool))
    }
  })
}
