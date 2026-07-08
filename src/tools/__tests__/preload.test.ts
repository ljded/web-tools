import { beforeEach, describe, expect, it, vi } from 'vitest'

const PRELOADED_TOOLS_KEY = 'web-tools:preloaded-tools'

const component = vi.fn(() => Promise.resolve())
const preloadAssets = vi.fn(() => Promise.resolve())

async function loadPreloadModule() {
  vi.resetModules()
  vi.stubGlobal('__APP_VERSION__', '0.2.3')
  vi.doMock('@/tools/registry', () => ({
    tools: [
      {
        name: 'json',
        component,
        preloadAssets,
      },
    ],
  }))
  return import('@/tools/preload')
}

describe('工具预加载状态', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    component.mockReset()
    component.mockResolvedValue(undefined)
    preloadAssets.mockReset()
    preloadAssets.mockResolvedValue(undefined)
  })

  it('应兼容旧版 number 存储记录并默认不标记为完整离线', async () => {
    localStorage.setItem(
      PRELOADED_TOOLS_KEY,
      JSON.stringify({
        appVersion: '0.2.3',
        tools: {
          json: 1710000000000,
          invalid: null,
        },
      }),
    )

    const { getPreloadedToolsState, getPreloadedToolNames } = await loadPreloadModule()

    expect(getPreloadedToolsState().tools).toEqual({
      json: { at: 1710000000000, assets: false },
    })
    expect(getPreloadedToolNames()).toEqual(new Set())
  })

  it('仅轻量预热组件时不应显示为已离线下载', async () => {
    const { preloadToolByNameNow, getPreloadedToolsState, getPreloadedToolNames } =
      await loadPreloadModule()

    await expect(preloadToolByNameNow('json')).resolves.toBe('loaded')

    expect(component).toHaveBeenCalledTimes(1)
    expect(preloadAssets).not.toHaveBeenCalled()
    expect(getPreloadedToolsState().tools.json?.assets).toBe(false)
    expect(getPreloadedToolNames()).toEqual(new Set())
  })

  it('完整离线下载应预加载资源并记录 assets 状态', async () => {
    const { preloadToolByNameNow, getPreloadedToolsState, getPreloadedToolNames } =
      await loadPreloadModule()

    await expect(preloadToolByNameNow('json', { includeAssets: true })).resolves.toBe('loaded')

    expect(component).toHaveBeenCalledTimes(1)
    expect(preloadAssets).toHaveBeenCalledTimes(1)
    expect(getPreloadedToolsState().tools.json?.assets).toBe(true)
    expect(getPreloadedToolNames()).toEqual(new Set(['json']))
  })

  it('已轻量预热的工具再次完整下载时应补齐资源', async () => {
    const { preloadToolByNameNow, getPreloadedToolsState } = await loadPreloadModule()

    await expect(preloadToolByNameNow('json')).resolves.toBe('loaded')
    await expect(preloadToolByNameNow('json', { includeAssets: true })).resolves.toBe('loaded')

    expect(component).toHaveBeenCalledTimes(2)
    expect(preloadAssets).toHaveBeenCalledTimes(1)
    expect(getPreloadedToolsState().tools.json?.assets).toBe(true)
  })

  it('已完整下载的工具再次下载应跳过', async () => {
    localStorage.setItem(
      PRELOADED_TOOLS_KEY,
      JSON.stringify({
        appVersion: '0.2.3',
        tools: {
          json: { at: 1710000000000, assets: true },
        },
      }),
    )
    const { preloadToolByNameNow } = await loadPreloadModule()

    await expect(preloadToolByNameNow('json', { includeAssets: true })).resolves.toBe('skipped')

    expect(component).not.toHaveBeenCalled()
    expect(preloadAssets).not.toHaveBeenCalled()
  })
})
