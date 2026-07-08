import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { searchTools } from '../search'

// Mock translate function
const mockTranslate = (key: string) => key

describe('Search Performance Benchmarks', () => {
  const PERFORMANCE_THRESHOLD = 50 // ms
  const ITERATIONS = 100

  function measureAvgTime(fn: () => void, iterations: number = ITERATIONS): number {
    const times: number[] = []

    // 预热
    for (let i = 0; i < 10; i++) {
      fn()
    }

    // 正式测试
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      fn()
      const end = performance.now()
      times.push(end - start)
    }

    return times.reduce((a, b) => a + b, 0) / times.length
  }

  it('搜索 "json" 应在 50ms 内完成', () => {
    const avgTime = measureAvgTime(() => {
      searchTools(mockTranslate, 'json', { cacheKey: 'zh-CN' })
    })

    console.log(`    平均搜索时间: ${avgTime.toFixed(2)}ms`)
    expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD)
  })

  it('搜索 "base64" 应在 50ms 内完成', () => {
    const avgTime = measureAvgTime(() => {
      searchTools(mockTranslate, 'base64', { cacheKey: 'zh-CN' })
    })

    console.log(`    平均搜索时间: ${avgTime.toFixed(2)}ms`)
    expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD)
  })

  it('搜索缓存应提供一致的性能', () => {
    const query = 'hash'

    // 冷缓存
    const coldTime = measureAvgTime(() => {
      searchTools(mockTranslate, query, { cacheKey: `cold-${Date.now()}` })
    }, 10)

    // 热缓存
    const cacheKey = 'hot-cache'
    searchTools(mockTranslate, query, { cacheKey }) // 预热

    const hotTime = measureAvgTime(() => {
      searchTools(mockTranslate, query, { cacheKey })
    })

    console.log(`    冷缓存: ${coldTime.toFixed(2)}ms`)
    console.log(`    热缓存: ${hotTime.toFixed(2)}ms`)
    console.log(`    差异: ${Math.abs(coldTime - hotTime).toFixed(2)}ms`)

    // 由于搜索已经非常快，缓存提升可能不明显
    // 主要验证两者都在可接受的性能范围内
    expect(coldTime).toBeLessThan(10)
    expect(hotTime).toBeLessThan(10)
  })

  it('空查询应立即返回', () => {
    const avgTime = measureAvgTime(() => {
      searchTools(mockTranslate, '', { cacheKey: 'zh-CN' })
    })

    console.log(`    平均时间: ${avgTime.toFixed(2)}ms`)
    expect(avgTime).toBeLessThan(10)
  })

  it('空查询不应构建功能项搜索目录', () => {
    const translatedKeys: string[] = []
    const trackingTranslate = (key: string) => {
      translatedKeys.push(key)
      return key
    }

    searchTools(trackingTranslate, '', { cacheKey: 'empty-feature-lazy' })
    expect(translatedKeys).not.toContain('tools.crypto.aes')

    searchTools(trackingTranslate, 'aes', { cacheKey: 'non-empty-feature-lazy' })
    expect(translatedKeys).toContain('tools.crypto.aes')
  })

  it('多关键词搜索应在 50ms 内完成', () => {
    const avgTime = measureAvgTime(() => {
      searchTools(mockTranslate, 'json editor', { cacheKey: 'zh-CN' })
    })

    console.log(`    平均搜索时间: ${avgTime.toFixed(2)}ms`)
    expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD)
  })
})
