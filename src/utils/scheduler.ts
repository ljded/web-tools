/**
 * 任务调度工具
 * 使用 requestIdleCallback 在浏览器空闲时执行非关键任务
 */

/**
 * 调度选项
 */
export interface ScheduleOptions {
  /** 超时时间（毫秒），超时后强制执行 */
  timeout?: number
  /** 优先级：high = 立即执行，low = 空闲时执行 */
  priority?: 'high' | 'low'
}

/**
 * 在浏览器空闲时执行任务
 */
export function scheduleIdleTask<T>(
  task: () => T | Promise<T>,
  options: ScheduleOptions = {}
): Promise<T> {
  const { timeout = 2000, priority = 'low' } = options

  // 高优先级任务立即执行
  if (priority === 'high') {
    return Promise.resolve(task())
  }

  return new Promise((resolve, reject) => {
    const callback = async () => {
      try {
        const result = await task()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    // 使用 requestIdleCallback 如果可用
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(callback, { timeout })
    } else {
      // Fallback: 使用 setTimeout
      setTimeout(callback, 0)
    }
  })
}

/**
 * 批量调度多个任务
 */
export async function scheduleBatch<T>(
  tasks: Array<() => T | Promise<T>>,
  options: ScheduleOptions = {}
): Promise<T[]> {
  const results: T[] = []

  for (const task of tasks) {
    const result = await scheduleIdleTask(task, options)
    results.push(result)
  }

  return results
}
