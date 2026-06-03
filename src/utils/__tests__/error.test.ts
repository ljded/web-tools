import { describe, it, expect } from 'vitest'
import { ErrorFactory, ApplicationError, ErrorType, ErrorSeverity, ErrorHandler } from '../error'

describe('ApplicationError', () => {
  it('should create error with message', () => {
    const error = new ApplicationError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.type).toBe(ErrorType.UNKNOWN)
    expect(error.severity).toBe(ErrorSeverity.ERROR)
  })

  it('should create error with custom type and severity', () => {
    const error = new ApplicationError('Test error', ErrorType.VALIDATION, ErrorSeverity.WARNING)
    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.severity).toBe(ErrorSeverity.WARNING)
  })

  it('should include details and context', () => {
    const error = new ApplicationError('Test error', ErrorType.FILE, ErrorSeverity.ERROR, {
      details: 'File is too large',
      context: { size: 1000000 },
    })
    expect(error.details).toBe('File is too large')
    expect(error.context).toEqual({ size: 1000000 })
  })

  it('should serialize to JSON', () => {
    const error = new ApplicationError('Test error', ErrorType.VALIDATION, ErrorSeverity.WARNING)
    const json = error.toJSON()
    expect(json.message).toBe('Test error')
    expect(json.type).toBe(ErrorType.VALIDATION)
    expect(json.severity).toBe(ErrorSeverity.WARNING)
  })
})

describe('ErrorFactory', () => {
  it('should create validation error', () => {
    const error = ErrorFactory.validation('Invalid input')
    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.severity).toBe(ErrorSeverity.WARNING)
    expect(error.message).toBe('Invalid input')
  })

  it('should create format error', () => {
    const error = ErrorFactory.format('Invalid JSON')
    expect(error.type).toBe(ErrorType.FORMAT)
    expect(error.severity).toBe(ErrorSeverity.ERROR)
  })

  it('should create computation error', () => {
    const originalError = new Error('Division by zero')
    const error = ErrorFactory.computation('Calculation failed', originalError)
    expect(error.type).toBe(ErrorType.COMPUTATION)
    expect(error.originalError).toBe(originalError)
  })

  it('should create file error', () => {
    const error = ErrorFactory.file('File too large', { size: 1000000 })
    expect(error.type).toBe(ErrorType.FILE)
    expect(error.context).toEqual({ size: 1000000 })
  })

  it('should convert unknown error', () => {
    const error = ErrorFactory.fromUnknown('Something went wrong')
    expect(error).toBeInstanceOf(ApplicationError)
    expect(error.message).toBe('Something went wrong')
  })

  it('should preserve ApplicationError', () => {
    const original = ErrorFactory.validation('Test')
    const converted = ErrorFactory.fromUnknown(original)
    expect(converted).toBe(original)
  })

  it('should convert Error object', () => {
    const original = new Error('Test error')
    const converted = ErrorFactory.fromUnknown(original)
    expect(converted.message).toBe('Test error')
    expect(converted.originalError).toBe(original)
  })
})

describe('ErrorHandler', () => {
  it('should handle ApplicationError', () => {
    const error = ErrorFactory.validation('Invalid input')
    const message = ErrorHandler.handle(error)
    expect(message).toBe('Invalid input')
  })

  it('should handle unknown errors', () => {
    const message = ErrorHandler.handle('Unknown error')
    expect(message).toBeTruthy()
  })

  it('should wrap async functions', async () => {
    const fn = async () => {
      throw new Error('Test error')
    }
    const result = await ErrorHandler.wrap(fn, 'fallback')
    expect(result).toBe('fallback')
  })

  it('should wrap sync functions', () => {
    const fn = () => {
      throw new Error('Test error')
    }
    const result = ErrorHandler.wrapSync(fn, 'fallback')
    expect(result).toBe('fallback')
  })

  it('should return result on success', async () => {
    const fn = async () => 'success'
    const result = await ErrorHandler.wrap(fn, 'fallback')
    expect(result).toBe('success')
  })
})
