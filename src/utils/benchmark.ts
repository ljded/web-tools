/**
 * 性能测试和基准测试工具
 */

import { performanceMonitor } from './performance'

export interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  opsPerSecond: number
}

export interface ComparisonResult {
  before: BenchmarkResult
  after: BenchmarkResult
  improvement: {
    percentage: number
    times: number
  }
}

/**
 * 执行基准测试
 */
export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = []

  // 预热
  for (let i = 0; i < Math.min(10, iterations); i++) {
    await fn()
  }

  // 正式测试
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }

  const totalTime = times.reduce((sum, t) => sum + t, 0)
  const avgTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const opsPerSecond = 1000 / avgTime

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond,
  }
}

/**
 * 比较两个实现的性能
 */
export async function compare(
  name: string,
  before: () => void | Promise<void>,
  after: () => void | Promise<void>,
  iterations: number = 100
): Promise<ComparisonResult> {
  console.log(`🔬 开始性能对比测试: ${name}`)

  const beforeResult = await benchmark(`${name} (优化前)`, before, iterations)
  const afterResult = await benchmark(`${name} (优化后)`, after, iterations)

  const improvement = {
    percentage: ((beforeResult.avgTime - afterResult.avgTime) / beforeResult.avgTime) * 100,
    times: beforeResult.avgTime / afterResult.avgTime,
  }

  console.log('\n📊 测试结果:')
  console.log(`优化前: ${beforeResult.avgTime.toFixed(3)}ms (avg)`)
  console.log(`优化后: ${afterResult.avgTime.toFixed(3)}ms (avg)`)
  console.log(`提升: ${improvement.percentage.toFixed(2)}% (${improvement.times.toFixed(2)}x 加速)`)

  return {
    before: beforeResult,
    after: afterResult,
    improvement,
  }
}

/**
 * 测试渲染性能
 */
export async function measureRender(
  name: string,
  renderFn: () => void | Promise<void>
): Promise<{ duration: number; fps: number }> {
  performanceMonitor.mark(`${name}-start`)
  await renderFn()
  performanceMonitor.mark(`${name}-end`)
  performanceMonitor.measureBetween(name, `${name}-start`, `${name}-end`)

  const metrics = performanceMonitor.getMetrics()
  const duration = metrics.custom?.[name] ?? 0
  const fps = duration > 0 ? 1000 / duration : 0

  return { duration, fps }
}

/**
 * 测试滚动性能
 */
export function measureScrollPerformance(
  element: HTMLElement,
  duration: number = 2000
): Promise<{ avgFps: number; minFps: number; maxFps: number; frameCount: number }> {
  return new Promise((resolve) => {
    const frameTimes: number[] = []
    let lastTime = performance.now()
    let frameId: number

    const measure = () => {
      const now = performance.now()
      const frameTime = now - lastTime
      frameTimes.push(frameTime)
      lastTime = now

      if (now - startTime < duration) {
        frameId = requestAnimationFrame(measure)
      } else {
        cancelAnimationFrame(frameId)

        const fps = frameTimes.map(t => 1000 / t)
        const avgFps = fps.reduce((sum, f) => sum + f, 0) / fps.length
        const minFps = Math.min(...fps)
        const maxFps = Math.max(...fps)

        resolve({
          avgFps,
          minFps,
          maxFps,
          frameCount: frameTimes.length,
        })
      }
    }

    const startTime = performance.now()

    // 自动滚动
    const scrollHeight = element.scrollHeight - element.clientHeight
    const scrollStep = scrollHeight / (duration / 16) // 假设 60fps
    let currentScroll = 0

    const scroll = () => {
      currentScroll += scrollStep
      element.scrollTop = Math.min(currentScroll, scrollHeight)

      if (currentScroll < scrollHeight) {
        requestAnimationFrame(scroll)
      }
    }

    frameId = requestAnimationFrame(measure)
    scroll()
  })
}

/**
 * 测试内存使用
 */
export function measureMemory(): {
  used: number
  total: number
  percentage: number
} | null {
  // @ts-ignore - performance.memory 可能不存在
  const memory = performance.memory

  if (!memory) {
    console.warn('Memory API 不可用')
    return null
  }

  const used = memory.usedJSHeapSize / (1024 * 1024) // MB
  const total = memory.totalJSHeapSize / (1024 * 1024) // MB
  const percentage = (used / total) * 100

  return { used, total, percentage }
}

/**
 * 测试长任务（Long Tasks）
 */
export function observeLongTasks(
  duration: number = 10000
): Promise<{ count: number; totalTime: number; avgTime: number }> {
  return new Promise((resolve) => {
    const longTasks: PerformanceEntry[] = []

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            longTasks.push(entry)
          }
        }
      })

      observer.observe({ entryTypes: ['longtask'] })

      setTimeout(() => {
        observer.disconnect()

        const totalTime = longTasks.reduce((sum, task) => sum + task.duration, 0)
        const avgTime = longTasks.length > 0 ? totalTime / longTasks.length : 0

        resolve({
          count: longTasks.length,
          totalTime,
          avgTime,
        })
      }, duration)
    } catch (error) {
      console.warn('Long Task API 不支持', error)
      resolve({ count: 0, totalTime: 0, avgTime: 0 })
    }
  })
}

/**
 * 生成性能报告
 */
export function generatePerformanceReport(): string {
  const metrics = performanceMonitor.getMetrics()
  const memory = measureMemory()

  const lines: string[] = [
    '='.repeat(60),
    '  性能测试报告',
    '='.repeat(60),
    '',
  ]

  // Web Vitals
  if (metrics.largestContentfulPaint || metrics.firstInputDelay || metrics.cumulativeLayoutShift) {
    lines.push('【核心 Web Vitals】')
    if (metrics.largestContentfulPaint) {
      lines.push(`  LCP: ${metrics.largestContentfulPaint.toFixed(2)}ms`)
    }
    if (metrics.firstInputDelay) {
      lines.push(`  FID: ${metrics.firstInputDelay.toFixed(2)}ms`)
    }
    if (metrics.cumulativeLayoutShift !== undefined) {
      lines.push(`  CLS: ${metrics.cumulativeLayoutShift.toFixed(3)}`)
    }
    lines.push('')
  }

  // 内存
  if (memory) {
    lines.push('【内存使用】')
    lines.push(`  已使用: ${memory.used.toFixed(2)} MB`)
    lines.push(`  总容量: ${memory.total.toFixed(2)} MB`)
    lines.push(`  使用率: ${memory.percentage.toFixed(2)}%`)
    lines.push('')
  }

  // 自定义指标
  if (metrics.custom && Object.keys(metrics.custom).length > 0) {
    lines.push('【自定义指标】')
    for (const [name, value] of Object.entries(metrics.custom)) {
      lines.push(`  ${name}: ${value.toFixed(2)}ms`)
    }
    lines.push('')
  }

  lines.push('='.repeat(60))

  return lines.join('\n')
}

/**
 * 自动化性能测试套件
 */
export async function runPerformanceTestSuite() {
  console.log('🚀 开始性能测试套件...\n')

  // 1. 测试 Long Tasks
  console.log('1️⃣ 监控 Long Tasks (10秒)...')
  const longTasksPromise = observeLongTasks(10000)

  // 2. 等待页面稳定
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 3. 测量内存
  console.log('2️⃣ 测量内存使用...')
  const memory = measureMemory()
  if (memory) {
    console.log(`   内存: ${memory.used.toFixed(2)} MB / ${memory.total.toFixed(2)} MB (${memory.percentage.toFixed(2)}%)`)
  }

  // 4. 等待 Long Tasks 结果
  const longTasks = await longTasksPromise
  console.log(`3️⃣ Long Tasks: ${longTasks.count} 个, 总时长 ${longTasks.totalTime.toFixed(2)}ms`)

  // 5. 生成完整报告
  console.log('\n📊 完整性能报告:')
  console.log(generatePerformanceReport())

  return {
    memory,
    longTasks,
    metrics: performanceMonitor.getMetrics(),
  }
}
