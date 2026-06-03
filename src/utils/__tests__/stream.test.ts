import { describe, it, expect, vi } from 'vitest'
import {
  fileToBase64Stream,
  base64ToBlob,
  arrayBufferToBase64,
  shouldUseStreaming,
  estimateMemoryUsage,
} from '../stream'

describe('stream utilities', () => {
  describe('arrayBufferToBase64', () => {
    it('should convert ArrayBuffer to Base64', () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(text).buffer

      const base64 = arrayBufferToBase64(buffer)
      expect(base64).toBe(btoa('Hello, World!'))
    })

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0)
      const base64 = arrayBufferToBase64(buffer)
      expect(base64).toBe('')
    })
  })

  describe('base64ToBlob', () => {
    it('should convert Base64 to Blob', async () => {
      const text = 'Hello, World!'
      const base64 = btoa(text)

      const blob = await base64ToBlob(base64, 'text/plain')
      expect(blob.type).toBe('text/plain')

      const result = await blob.text()
      expect(result).toBe(text)
    })

    it('should handle data URI prefix', async () => {
      const text = 'Hello, World!'
      const base64 = `data:text/plain;base64,${btoa(text)}`

      const blob = await base64ToBlob(base64, 'text/plain')
      const result = await blob.text()
      expect(result).toBe(text)
    })

    it('should report progress', async () => {
      const base64 = btoa('Hello, World!')
      const progressCallback = vi.fn()

      await base64ToBlob(base64, 'text/plain', progressCallback)
      expect(progressCallback).toHaveBeenCalled()
      expect(progressCallback).toHaveBeenCalledWith(100)
    })

    it('should throw on invalid base64', async () => {
      await expect(base64ToBlob('invalid!@#$', 'text/plain')).rejects.toThrow('Invalid base64 string')
    })
  })

  describe('shouldUseStreaming', () => {
    it('should use streaming for large files', () => {
      expect(shouldUseStreaming(20 * 1024 * 1024, 'base64-encode')).toBe(true)
      expect(shouldUseStreaming(20 * 1024 * 1024, 'base64-decode')).toBe(true)
      expect(shouldUseStreaming(100 * 1024 * 1024, 'hash')).toBe(true)
    })

    it('should not use streaming for small files', () => {
      expect(shouldUseStreaming(5 * 1024 * 1024, 'base64-encode')).toBe(false)
      expect(shouldUseStreaming(5 * 1024 * 1024, 'base64-decode')).toBe(false)
      expect(shouldUseStreaming(10 * 1024 * 1024, 'hash')).toBe(false)
    })
  })

  describe('estimateMemoryUsage', () => {
    it('should estimate memory for base64 encode', () => {
      const fileSize = 10 * 1024 * 1024 // 10MB
      const estimate = estimateMemoryUsage(fileSize, 'base64-encode')
      expect(estimate).toBe(fileSize * 1.5)
    })

    it('should estimate memory for base64 decode', () => {
      const fileSize = 10 * 1024 * 1024 // 10MB
      const estimate = estimateMemoryUsage(fileSize, 'base64-decode')
      expect(estimate).toBe(fileSize * 0.8)
    })

    it('should estimate memory for hash with cap', () => {
      const smallFile = 10 * 1024 * 1024 // 10MB
      const estimate1 = estimateMemoryUsage(smallFile, 'hash')
      expect(estimate1).toBe(smallFile * 0.1)

      const largeFile = 1024 * 1024 * 1024 // 1GB
      const estimate2 = estimateMemoryUsage(largeFile, 'hash')
      expect(estimate2).toBe(50 * 1024 * 1024) // Capped at 50MB
    })
  })

  describe('fileToBase64Stream', () => {
    it('should convert file to base64 with progress', async () => {
      const text = 'Hello, World!'
      const blob = new Blob([text], { type: 'text/plain' })
      const file = new File([blob], 'test.txt', { type: 'text/plain' })

      const progressCallback = vi.fn()
      const base64 = await fileToBase64Stream(file, progressCallback)

      expect(base64).toBe(btoa(text))
      expect(progressCallback).toHaveBeenCalled()
    })
  })
})
