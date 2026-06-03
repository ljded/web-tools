import { describe, it, expect } from 'vitest'

/**
 * Hash 功能测试（SHA-256, MD5等）
 */
describe('Hash 工具逻辑', () => {
  describe('SHA-256', () => {
    it('应正确计算简单文本的 SHA-256', async () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // 验证哈希长度（SHA-256 是 64 个十六进制字符）
      expect(hashHex.length).toBe(64)
      expect(hashHex).toMatch(/^[0-9a-f]{64}$/)
    })

    it('应正确计算空字符串的 SHA-256', async () => {
      const text = ''
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // 空字符串的 SHA-256 是固定值
      expect(hashHex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('不同的输入应产生不同的哈希', async () => {
      const hash1 = await hashText('text1')
      const hash2 = await hashText('text2')
      expect(hash1).not.toBe(hash2)
    })

    it('相同的输入应产生相同的哈希', async () => {
      const text = 'Same text'
      const hash1 = await hashText(text)
      const hash2 = await hashText(text)
      expect(hash1).toBe(hash2)
    })

    it('应正确处理 Unicode 字符', async () => {
      const text = '你好世界 🌍'
      const hash = await hashText(text)
      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('细微差异应导致完全不同的哈希（雪崩效应）', async () => {
      const hash1 = await hashText('Hello World')
      const hash2 = await hashText('Hello world') // 小写 w
      expect(hash1).not.toBe(hash2)

      // 计算差异位数
      const diff = Array.from(hash1)
        .filter((char, i) => char !== hash2[i])
        .length
      // 应该有大量位不同
      expect(diff).toBeGreaterThan(30)
    })
  })

  describe('SHA-1', () => {
    it('应正确计算 SHA-1', async () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-1', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // SHA-1 是 40 个十六进制字符
      expect(hashHex.length).toBe(40)
      expect(hashHex).toMatch(/^[0-9a-f]{40}$/)
    })
  })

  describe('SHA-384', () => {
    it('应正确计算 SHA-384', async () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-384', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // SHA-384 是 96 个十六进制字符
      expect(hashHex.length).toBe(96)
      expect(hashHex).toMatch(/^[0-9a-f]{96}$/)
    })
  })

  describe('SHA-512', () => {
    it('应正确计算 SHA-512', async () => {
      const text = 'Hello, World!'
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-512', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // SHA-512 是 128 个十六进制字符
      expect(hashHex.length).toBe(128)
      expect(hashHex).toMatch(/^[0-9a-f]{128}$/)
    })
  })

  describe('哈希性能', () => {
    it('应能快速处理长文本', async () => {
      const longText = 'a'.repeat(10000)
      const start = performance.now()
      await hashText(longText)
      const duration = performance.now() - start

      // 应在 100ms 内完成
      expect(duration).toBeLessThan(100)
    })

    it('应能批量计算哈希', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `text${i}`)
      const hashes = await Promise.all(texts.map(hashText))

      expect(hashes.length).toBe(100)
      // 所有哈希应该不同
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(100)
    })
  })

  describe('格式转换', () => {
    it('应支持十六进制格式', async () => {
      const hash = await hashText('test')
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })

    it('应支持 Base64 格式', async () => {
      const text = 'test'
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const base64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

      expect(base64).toBeTruthy()
      expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })
  })
})

// Helper function
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
