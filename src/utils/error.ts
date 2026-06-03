/**
 * 统一错误类型系统
 *
 * 提供应用级别的错误分类、处理和展示机制
 */

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 验证错误 - 用户输入不符合要求 */
  VALIDATION = 'validation',

  /** 格式错误 - 数据格式不正确 */
  FORMAT = 'format',

  /** 计算错误 - 工具计算过程出错 */
  COMPUTATION = 'computation',

  /** 文件错误 - 文件读取/处理错误 */
  FILE = 'file',

  /** 网络错误 - API 调用失败 */
  NETWORK = 'network',

  /** 存储错误 - localStorage/IndexedDB 错误 */
  STORAGE = 'storage',

  /** 权限错误 - 缺少必要权限 */
  PERMISSION = 'permission',

  /** 系统错误 - 未预期的系统级错误 */
  SYSTEM = 'system',

  /** 未知错误 */
  UNKNOWN = 'unknown',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  /** 信息 - 不影响功能，仅提示用户 */
  INFO = 'info',

  /** 警告 - 可能影响结果，但可以继续 */
  WARNING = 'warning',

  /** 错误 - 阻止当前操作完成 */
  ERROR = 'error',

  /** 严重 - 可能影响应用稳定性 */
  CRITICAL = 'critical',
}

/**
 * 应用错误接口
 */
export interface AppError {
  /** 错误类型 */
  type: ErrorType

  /** 错误严重程度 */
  severity: ErrorSeverity

  /** 用户友好的错误消息 */
  message: string

  /** 技术性错误详情（开发用） */
  details?: string

  /** 原始错误对象 */
  originalError?: Error

  /** 错误代码（可选） */
  code?: string

  /** 上下文信息 */
  context?: Record<string, unknown>

  /** 建议的用户操作 */
  suggestedAction?: string

  /** 时间戳 */
  timestamp: number
}

/**
 * 应用错误类
 */
export class ApplicationError extends Error implements AppError {
  type: ErrorType
  severity: ErrorSeverity
  details?: string
  originalError?: Error
  code?: string
  context?: Record<string, unknown>
  suggestedAction?: string
  timestamp: number

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    options?: {
      details?: string
      originalError?: Error
      code?: string
      context?: Record<string, unknown>
      suggestedAction?: string
    }
  ) {
    super(message)
    this.name = 'ApplicationError'
    this.type = type
    this.severity = severity
    this.details = options?.details
    this.originalError = options?.originalError
    this.code = options?.code
    this.context = options?.context
    this.suggestedAction = options?.suggestedAction
    this.timestamp = Date.now()

    // 保持正确的原型链
    Object.setPrototypeOf(this, ApplicationError.prototype)
  }

  /**
   * 转换为普通对象（便于序列化）
   */
  toJSON(): AppError {
    return {
      type: this.type,
      severity: this.severity,
      message: this.message,
      details: this.details,
      code: this.code,
      context: this.context,
      suggestedAction: this.suggestedAction,
      timestamp: this.timestamp,
    }
  }
}

/**
 * 错误工厂函数
 */
export const ErrorFactory = {
  /**
   * 创建验证错误
   */
  validation(message: string, suggestedAction?: string): ApplicationError {
    return new ApplicationError(message, ErrorType.VALIDATION, ErrorSeverity.WARNING, {
      suggestedAction: suggestedAction || '请检查输入并重试',
    })
  },

  /**
   * 创建格式错误
   */
  format(message: string, details?: string): ApplicationError {
    return new ApplicationError(message, ErrorType.FORMAT, ErrorSeverity.ERROR, {
      details,
      suggestedAction: '请确保数据格式正确',
    })
  },

  /**
   * 创建计算错误
   */
  computation(message: string, originalError?: Error): ApplicationError {
    return new ApplicationError(message, ErrorType.COMPUTATION, ErrorSeverity.ERROR, {
      originalError,
      details: originalError?.message,
      suggestedAction: '请尝试使用不同的输入',
    })
  },

  /**
   * 创建文件错误
   */
  file(message: string, context?: Record<string, unknown>): ApplicationError {
    return new ApplicationError(message, ErrorType.FILE, ErrorSeverity.ERROR, {
      context,
      suggestedAction: '请检查文件格式和大小',
    })
  },

  /**
   * 创建网络错误
   */
  network(message: string, originalError?: Error): ApplicationError {
    return new ApplicationError(message, ErrorType.NETWORK, ErrorSeverity.ERROR, {
      originalError,
      details: originalError?.message,
      suggestedAction: '请检查网络连接并重试',
    })
  },

  /**
   * 创建存储错误
   */
  storage(message: string, originalError?: Error): ApplicationError {
    return new ApplicationError(message, ErrorType.STORAGE, ErrorSeverity.WARNING, {
      originalError,
      details: originalError?.message,
      suggestedAction: '请检查浏览器存储权限',
    })
  },

  /**
   * 创建权限错误
   */
  permission(message: string, permission: string): ApplicationError {
    return new ApplicationError(message, ErrorType.PERMISSION, ErrorSeverity.ERROR, {
      context: { permission },
      suggestedAction: '请授予必要的权限',
    })
  },

  /**
   * 创建系统错误
   */
  system(message: string, originalError?: Error): ApplicationError {
    return new ApplicationError(message, ErrorType.SYSTEM, ErrorSeverity.CRITICAL, {
      originalError,
      details: originalError?.message,
      suggestedAction: '请刷新页面或联系技术支持',
    })
  },

  /**
   * 从未知错误创建应用错误
   */
  fromUnknown(error: unknown): ApplicationError {
    if (error instanceof ApplicationError) {
      return error
    }

    if (error instanceof Error) {
      return new ApplicationError(error.message, ErrorType.UNKNOWN, ErrorSeverity.ERROR, {
        originalError: error,
      })
    }

    return new ApplicationError(String(error), ErrorType.UNKNOWN, ErrorSeverity.ERROR)
  },
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  /**
   * 处理错误并返回用户友好的消息
   */
  static handle(error: unknown): string {
    const appError = error instanceof ApplicationError ? error : ErrorFactory.fromUnknown(error)

    // 记录错误（生产环境可以发送到监控服务）
    if (appError.severity === ErrorSeverity.CRITICAL) {
      console.error('[CRITICAL]', appError)
    } else if (appError.severity === ErrorSeverity.ERROR) {
      console.error('[ERROR]', appError)
    } else if (appError.severity === ErrorSeverity.WARNING) {
      console.warn('[WARNING]', appError)
    } else {
      console.info('[INFO]', appError)
    }

    return appError.message
  }

  /**
   * 包装异步函数，自动捕获和处理错误
   */
  static async wrap<T>(fn: () => Promise<T>, fallback?: T): Promise<T | undefined> {
    try {
      return await fn()
    } catch (error) {
      ErrorHandler.handle(error)
      return fallback
    }
  }

  /**
   * 包装同步函数，自动捕获和处理错误
   */
  static wrapSync<T>(fn: () => T, fallback?: T): T | undefined {
    try {
      return fn()
    } catch (error) {
      ErrorHandler.handle(error)
      return fallback
    }
  }
}

/**
 * 错误边界组合式函数（用于 Vue 组件）
 */
export function useErrorBoundary() {
  const handleError = (error: unknown): string => {
    return ErrorHandler.handle(error)
  }

  const wrapAsync = async <T>(fn: () => Promise<T>, fallback?: T): Promise<T | undefined> => {
    return ErrorHandler.wrap(fn, fallback)
  }

  const wrapSync = <T>(fn: () => T, fallback?: T): T | undefined => {
    return ErrorHandler.wrapSync(fn, fallback)
  }

  return {
    handleError,
    wrapAsync,
    wrapSync,
  }
}

/**
 * 创建与 Toast 和 i18n 集成的错误处理器
 */
export function createErrorHandler(toast: any, t: (key: string, params?: any) => string) {
  return (error: unknown, fallbackMessage?: string) => {
    const appError = error instanceof ApplicationError ? error : ErrorFactory.fromUnknown(error)

    // 记录到控制台
    ErrorHandler.handle(error)

    // 显示 Toast 通知
    const color = appError.severity === ErrorSeverity.WARNING ? 'warning' : 'error'
    const icon = appError.severity === ErrorSeverity.WARNING ? 'i-lucide-triangle-alert' : 'i-lucide-circle-alert'

    toast.add({
      title: appError.message,
      description: fallbackMessage || appError.suggestedAction || appError.details,
      color,
      icon,
      timeout: 5000,
    })
  }
}
