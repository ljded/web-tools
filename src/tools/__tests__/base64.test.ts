import { describe, it, expect } from 'vitest'

/**
 * Base64 编码/解码功能测试
 */
describe('Base64 工具逻辑', () => {
  describe('编码功能', () => {
    it('应正确编码普通文本', () => {
      const text = 'Hello, World!'
      const encoded = btoa(text)
      expect(encoded).toBe('SGVsbG8sIFdvcmxkIQ==')
    })

    it('应正确编码空字符串', () => {
      const text = ''
      const encoded = btoa(text)
      expect(encoded).toBe('')
    })

    it('应正确编码数字', () => {
      const text = '12345'
      const encoded = btoa(text)
      expect(encoded).toBe('MTIzNDU=')
    })

    it('应正确编码特殊字符', () => {
      const text = '!@#$%^&*()'
      const encoded = btoa(text)
      expect(encoded).toBe('IUAjJCVeJiooKQ==')
    })
  })

  describe('解码功能', () => {
    it('应正确解码 Base64 字符串', () => {
      const encoded = 'SGVsbG8sIFdvcmxkIQ=='
      const decoded = atob(encoded)
      expect(decoded).toBe('Hello, World!')
    })

    it('应正确解码空字符串', () => {
      const encoded = ''
      const decoded = atob(encoded)
      expect(decoded).toBe('')
    })

    it('应正确解码数字', () => {
      const encoded = 'MTIzNDU='
      const decoded = atob(encoded)
      expect(decoded).toBe('12345')
    })

    it('应正确处理无效的 Base64', () => {
      const invalid = 'Invalid Base64!!!'
      expect(() => atob(invalid)).toThrow()
    })
  })

  describe('往返转换', () => {
    it('编码后解码应得到原文本', () => {
      const original = 'Test string for round-trip'
      const encoded = btoa(original)
      const decoded = atob(encoded)
      expect(decoded).toBe(original)
    })

    it('应正确处理包含换行的文本', () => {
      const original = 'Line 1\nLine 2\nLine 3'
      const encoded = btoa(original)
      const decoded = atob(encoded)
      expect(decoded).toBe(original)
    })
  })

  describe('URL 安全 Base64', () => {
    it('应能处理 URL 安全的 Base64（替换字符）', () => {
      // 标准 Base64 使用 +/ 字符
      // URL 安全版本使用 -_ 字符
      const text = 'subjects?_d=1'
      const standardBase64 = btoa(text)

      // 转换为 URL 安全格式
      const urlSafeBase64 = standardBase64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '') // 移除尾部的 =

      expect(urlSafeBase64).toBeTruthy()
      expect(urlSafeBase64).not.toContain('+')
      expect(urlSafeBase64).not.toContain('/')
    })
  })

  describe('UTF-8 支持', () => {
    it('应正确编码中文字符', () => {
      const text = '你好世界'
      // 需要先转换为 UTF-8 字节
      const encoded = btoa(unescape(encodeURIComponent(text)))
      expect(encoded).toBeTruthy()

      // 解码
      const decoded = decodeURIComponent(escape(atob(encoded)))
      expect(decoded).toBe(text)
    })

    it('应正确编码 emoji', () => {
      const text = 'Hello 👋 World 🌍'
      const encoded = btoa(unescape(encodeURIComponent(text)))
      expect(encoded).toBeTruthy()

      const decoded = decodeURIComponent(escape(atob(encoded)))
      expect(decoded).toBe(text)
    })

    it('应正确编码日文字符', () => {
      const text = 'こんにちは世界'
      const encoded = btoa(unescape(encodeURIComponent(text)))
      expect(encoded).toBeTruthy()

      const decoded = decodeURIComponent(escape(atob(encoded)))
      expect(decoded).toBe(text)
    })
  })
})
