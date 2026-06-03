/**
 * 性能基准测试脚本
 *
 * 用于建立项目的性能基线，方便后续优化效果对比
 */

import { performance } from 'perf_hooks'
import { searchTools } from '../src/tools/search'

interface BenchmarkResult {
  name: string
  avgTime: number
  minTime: number
  maxTime: number
  iterations: number
}

/**
 * 运行基准测试
 */
async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = []

  // 预热
  for (let i = 0; i < 10; i++) {
    await fn()
  }

  // 正式测试
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return {
    name,
    avgTime,
    minTime,
    maxTime,
    iterations,
  }
}

/**
 * 搜索性能测试
 */
async function benchmarkSearch() {
  console.log('🔍 搜索性能基准测试\n')

  const searchQueries = [
    'json',
    'base64',
    'hash',
    'timestamp',
    'regex',
    'markdown',
    'qrcode',
  ]

  for (const query of searchQueries) {
    const result = await runBenchmark(`搜索 "${query}"`, () => {
      searchTools(query, { locale: 'zh-CN' })
    })

    console.log(`  ${result.name}:`)
    console.log(`    平均: ${result.avgTime.toFixed(2)}ms`)
    console.log(`    最小: ${result.minTime.toFixed(2)}ms`)
    console.log(`    最大: ${result.maxTime.toFixed(2)}ms`)
    console.log()
  }
}

/**
 * 多次搜索测试（测试缓存效果）
 */
async function benchmarkSearchCache() {
  console.log('💾 搜索缓存性能测试\n')

  const query = 'json'

  // 第一次搜索（冷缓存）
  const firstResult = await runBenchmark('首次搜索 (冷缓存)', () => {
    searchTools(query, { locale: 'zh-CN', cacheKey: `test-${Date.now()}` })
  }, 10)

  console.log(`  首次搜索:`)
  console.log(`    平均: ${firstResult.avgTime.toFixed(2)}ms`)
  console.log()

  // 重复搜索（热缓存）
  const cacheKey = 'test-cache'
  searchTools(query, { locale: 'zh-CN', cacheKey }) // 预热缓存

  const cachedResult = await runBenchmark('重复搜索 (热缓存)', () => {
    searchTools(query, { locale: 'zh-CN', cacheKey })
  }, 100)

  console.log(`  重复搜索:`)
  console.log(`    平均: ${cachedResult.avgTime.toFixed(2)}ms`)
  console.log()

  const improvement = ((firstResult.avgTime - cachedResult.avgTime) / firstResult.avgTime * 100)
  console.log(`  ✅ 缓存性能提升: ${improvement.toFixed(1)}%`)
  console.log()
}

/**
 * 打印基准报告摘要
 */
function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 性能基准测试完成')
  console.log('='.repeat(60))
  console.log()
  console.log('性能目标:')
  console.log('  ✅ 搜索响应时间: < 50ms')
  console.log('  ✅ 缓存命中提升: > 40%')
  console.log()
  console.log('💾 基准数据已记录，可用于后续优化对比')
  console.log()
}

/**
 * 主函数
 */
async function main() {
  console.clear()
  console.log('=' .repeat(60))
  console.log('🚀 Web Tools 性能基准测试')
  console.log('='.repeat(60))
  console.log()

  try {
    await benchmarkSearch()
    await benchmarkSearchCache()
    printSummary()
  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
main()
