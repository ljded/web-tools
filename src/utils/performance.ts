/**
 * 性能监控工具
 *
 * 收集和分析应用性能指标
 */

/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  /** 页面加载时间（ms） */
  pageLoadTime?: number

  /** 首次内容绘制（ms） */
  firstContentfulPaint?: number

  /** 最大内容绘制（ms） */
  largestContentfulPaint?: number

  /** 首次输入延迟（ms） */
  firstInputDelay?: number

  /** 累积布局偏移 */
  cumulativeLayoutShift?: number

  /** 交互到下一次绘制（ms） */
  interactionToNextPaint?: number

  /** 内存使用（MB） */
  memoryUsage?: number

  /** JS 堆大小（MB） */
  jsHeapSize?: number

  /** 自定义指标 */
  custom?: Record<string, number>
}

/**
 * 性能条目类型
 */
export interface PerformanceEntry {
  name: string
  entryType: string
  startTime: number
  duration: number
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private observers: PerformanceObserver[] = []
  private startTime: number = performance.now()

  constructor() {
    if (typeof window === 'undefined') return
    this.init()
  }

  /**
   * 初始化性能监控
   */
  private init() {
    // 监控导航时间
    this.observeNavigation()

    // 监控 Web Vitals
    this.observePaint()
    this.observeLCP()
    this.observeFID()
    this.observeCLS()
    this.observeINP()

    // 监控内存使用
    this.observeMemory()
  }

  /**
   * 监控导航性能
   */
  private observeNavigation() {
    if (typeof window === 'undefined' || !window.performance?.timing) return

    window.addEventListener('load', () => {
      const timing = performance.timing
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart

      this.metrics.pageLoadTime = pageLoadTime
    })
  }

  /**
   * 监控首次内容绘制（FCP）
   */
  private observePaint() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime
          }
        }
      })

      observer.observe({ entryTypes: ['paint'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('Paint observer not supported', error)
    }
  }

  /**
   * 监控最大内容绘制（LCP）
   */
  private observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          this.metrics.largestContentfulPaint = lastEntry.startTime
        }
      })

      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('LCP observer not supported', error)
    }
  }

  /**
   * 监控首次输入延迟（FID）
   */
  private observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // @ts-ignore - processingStart 可能不存在
          const fid = entry.processingStart - entry.startTime
          this.metrics.firstInputDelay = fid
        }
      })

      observer.observe({ entryTypes: ['first-input'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('FID observer not supported', error)
    }
  }

  /**
   * 监控累积布局偏移（CLS）
   */
  private observeCLS() {
    try {
      let clsValue = 0

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // @ts-ignore - hadRecentInput 可能不存在
          if (!entry.hadRecentInput) {
            // @ts-ignore - value 可能不存在
            clsValue += entry.value
            this.metrics.cumulativeLayoutShift = clsValue
          }
        }
      })

      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('CLS observer not supported', error)
    }
  }

  /**
   * 监控交互到下一次绘制（INP）
   */
  private observeINP() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // @ts-ignore - duration 作为 INP
          this.metrics.interactionToNextPaint = entry.duration
        }
      })

      observer.observe({ entryTypes: ['event'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('INP observer not supported', error)
    }
  }

  /**
   * 监控内存使用
   */
  private observeMemory() {
    if (typeof window === 'undefined') return

    // @ts-ignore - performance.memory 可能不存在
    const memory = performance.memory

    if (memory) {
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // MB
      this.metrics.jsHeapSize = memory.totalJSHeapSize / (1024 * 1024) // MB
    }
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name: string, value: number) {
    if (!this.metrics.custom) {
      this.metrics.custom = {}
    }
    this.metrics.custom[name] = value
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordCustomMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordCustomMetric(`${name}_error`, duration)
      throw error
    }
  }

  /**
   * 标记时间点
   */
  mark(name: string) {
    performance.mark(name)
  }

  /**
   * 测量两个标记之间的时间
   */
  measureBetween(name: string, startMark: string, endMark: string) {
    try {
      performance.measure(name, startMark, endMark)
      const measures = performance.getEntriesByName(name, 'measure')
      if (measures.length > 0) {
        const lastMeasure = measures[measures.length - 1]
        if (lastMeasure) {
          this.recordCustomMetric(name, lastMeasure.duration)
        }
      }
    } catch (error) {
      console.warn(`Cannot measure ${name}`, error)
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 获取性能报告
   */
  getReport(): string {
    const metrics = this.getMetrics()
    const lines: string[] = ['性能报告', '='.repeat(50), '']

    // Web Vitals
    lines.push('📊 核心 Web Vitals:')
    if (metrics.largestContentfulPaint) {
      const rating = this.rateLCP(metrics.largestContentfulPaint)
      lines.push(`  LCP: ${metrics.largestContentfulPaint.toFixed(2)}ms ${rating}`)
    }
    if (metrics.firstInputDelay) {
      const rating = this.rateFID(metrics.firstInputDelay)
      lines.push(`  FID: ${metrics.firstInputDelay.toFixed(2)}ms ${rating}`)
    }
    if (metrics.cumulativeLayoutShift !== undefined) {
      const rating = this.rateCLS(metrics.cumulativeLayoutShift)
      lines.push(`  CLS: ${metrics.cumulativeLayoutShift.toFixed(3)} ${rating}`)
    }

    lines.push('')

    // 其他指标
    lines.push('⏱️  其他性能指标:')
    if (metrics.firstContentfulPaint) {
      lines.push(`  FCP: ${metrics.firstContentfulPaint.toFixed(2)}ms`)
    }
    if (metrics.pageLoadTime) {
      lines.push(`  页面加载: ${metrics.pageLoadTime.toFixed(2)}ms`)
    }
    if (metrics.interactionToNextPaint) {
      lines.push(`  INP: ${metrics.interactionToNextPaint.toFixed(2)}ms`)
    }

    lines.push('')

    // 内存
    if (metrics.memoryUsage) {
      lines.push('💾 内存使用:')
      lines.push(`  JS 堆使用: ${metrics.memoryUsage.toFixed(2)}MB`)
      if (metrics.jsHeapSize) {
        lines.push(`  JS 堆大小: ${metrics.jsHeapSize.toFixed(2)}MB`)
      }
      lines.push('')
    }

    // 自定义指标
    if (metrics.custom && Object.keys(metrics.custom).length > 0) {
      lines.push('🎯 自定义指标:')
      for (const [name, value] of Object.entries(metrics.custom)) {
        lines.push(`  ${name}: ${value.toFixed(2)}ms`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 获取 JSON 格式的性能报告（用于上报）
   */
  getReportJSON(): {
    timestamp: number
    metrics: PerformanceMetrics
    ratings: {
      lcp?: 'good' | 'needs-improvement' | 'poor'
      fid?: 'good' | 'needs-improvement' | 'poor'
      cls?: 'good' | 'needs-improvement' | 'poor'
    }
    userAgent: string
  } {
    const metrics = this.getMetrics()
    return {
      timestamp: Date.now(),
      metrics,
      ratings: {
        lcp: metrics.largestContentfulPaint ? this.getLCPRating(metrics.largestContentfulPaint) : undefined,
        fid: metrics.firstInputDelay ? this.getFIDRating(metrics.firstInputDelay) : undefined,
        cls: metrics.cumulativeLayoutShift !== undefined ? this.getCLSRating(metrics.cumulativeLayoutShift) : undefined,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    }
  }

  /**
   * 获取 LCP 评级（机器可读）
   */
  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 获取 FID 评级（机器可读）
   */
  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good'
    if (value <= 300) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 获取 CLS 评级（机器可读）
   */
  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
  }

  /**
   * LCP 评级
   */
  private rateLCP(value: number): string {
    if (value <= 2500) return '✅ 优秀'
    if (value <= 4000) return '⚠️ 需要改进'
    return '❌ 差'
  }

  /**
   * FID 评级
   */
  private rateFID(value: number): string {
    if (value <= 100) return '✅ 优秀'
    if (value <= 300) return '⚠️ 需要改进'
    return '❌ 差'
  }

  /**
   * CLS 评级
   */
  private rateCLS(value: number): string {
    if (value <= 0.1) return '✅ 优秀'
    if (value <= 0.25) return '⚠️ 需要改进'
    return '❌ 差'
  }

  /**
   * 清理监控器
   */
  destroy() {
    for (const observer of this.observers) {
      observer.disconnect()
    }
    this.observers = []
  }
}

/**
 * 全局性能监控器实例
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Vue composable for performance monitoring
 */
export function usePerformance() {
  const measure = async <T>(name: string, fn: () => T | Promise<T>): Promise<T> => {
    return performanceMonitor.measure(name, fn)
  }

  const mark = (name: string) => {
    performanceMonitor.mark(name)
  }

  const measureBetween = (name: string, startMark: string, endMark: string) => {
    performanceMonitor.measureBetween(name, startMark, endMark)
  }

  const getMetrics = () => {
    return performanceMonitor.getMetrics()
  }

  const getReport = () => {
    return performanceMonitor.getReport()
  }

  return {
    measure,
    mark,
    measureBetween,
    getMetrics,
    getReport,
  }
}
