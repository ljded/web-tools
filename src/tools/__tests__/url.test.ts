import { describe, it, expect } from 'vitest'

/**
 * URL 编码/解码功能测试
 */
describe('URL 工具逻辑', () => {
  describe('encodeURIComponent', () => {
    it('应正确编码特殊字符', () => {
      const text = 'hello world'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBe('hello%20world')
    })

    it('应正确编码中文字符', () => {
      const text = '你好'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBeTruthy()
      expect(encoded).toContain('%')
    })

    it('应正确编码特殊符号', () => {
      const text = '!@#$%^&*()'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBe('!%40%23%24%25%5E%26*()')
    })

    it('应保留字母和数字', () => {
      const text = 'abc123'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBe('abc123')
    })

    it('应正确编码 URL 保留字符', () => {
      const text = '?key=value&foo=bar'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBe('%3Fkey%3Dvalue%26foo%3Dbar')
    })

    it('应正确编码路径分隔符', () => {
      const text = 'path/to/file'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBe('path%2Fto%2Ffile')
    })

    it('应正确编码 emoji', () => {
      const text = '👋🌍'
      const encoded = encodeURIComponent(text)
      expect(encoded).toBeTruthy()
      expect(encoded).toContain('%')
    })
  })

  describe('decodeURIComponent', () => {
    it('应正确解码空格', () => {
      const encoded = 'hello%20world'
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe('hello world')
    })

    it('应正确解码中文字符', () => {
      const text = '你好'
      const encoded = encodeURIComponent(text)
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe(text)
    })

    it('应正确解码特殊符号', () => {
      const encoded = '!%40%23%24%25%5E%26*()'
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe('!@#$%^&*()')
    })

    it('应正确解码 emoji', () => {
      const text = '👋🌍'
      const encoded = encodeURIComponent(text)
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe(text)
    })

    it('应拒绝格式错误的编码', () => {
      const invalid = 'hello%2world' // 不完整的百分号编码
      expect(() => decodeURIComponent(invalid)).toThrow()
    })
  })

  describe('往返转换', () => {
    it('编码后解码应得到原文本', () => {
      const original = 'Test string with spaces & symbols!'
      const encoded = encodeURIComponent(original)
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe(original)
    })

    it('应正确处理复杂 URL', () => {
      const original = 'https://example.com/path?query=测试&foo=bar'
      const encoded = encodeURIComponent(original)
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe(original)
    })
  })

  describe('encodeURI vs encodeURIComponent', () => {
    it('encodeURI 应保留 URL 结构字符', () => {
      const url = 'https://example.com/path?query=value'
      const encoded = encodeURI(url)
      expect(encoded).toBe(url) // 应该基本不变
    })

    it('encodeURIComponent 应编码所有特殊字符', () => {
      const url = 'https://example.com/path?query=value'
      const encoded = encodeURIComponent(url)
      expect(encoded).toContain('%3A') // : 被编码
      expect(encoded).toContain('%2F') // / 被编码
    })
  })

  describe('查询参数处理', () => {
    it('应正确编码查询参数值', () => {
      const key = 'search'
      const value = 'hello world & test'
      const encoded = `${key}=${encodeURIComponent(value)}`
      expect(encoded).toBe('search=hello%20world%20%26%20test')
    })

    it('应正确解析查询字符串', () => {
      const query = 'name=John%20Doe&age=30&city=%E5%8C%97%E4%BA%AC'
      const params = new URLSearchParams(query)
      expect(params.get('name')).toBe('John Doe')
      expect(params.get('age')).toBe('30')
      expect(params.get('city')).toBe('北京')
    })

    it('应正确构建查询字符串', () => {
      const params = new URLSearchParams()
      params.set('name', 'John Doe')
      params.set('age', '30')
      const query = params.toString()
      expect(query).toContain('name=John+Doe')
      expect(query).toContain('age=30')
    })
  })

  describe('URL 构造器', () => {
    it('应正确解析完整 URL', () => {
      const urlString = 'https://example.com:8080/path/to/page?query=test#section'
      const url = new URL(urlString)
      expect(url.protocol).toBe('https:')
      expect(url.hostname).toBe('example.com')
      expect(url.port).toBe('8080')
      expect(url.pathname).toBe('/path/to/page')
      expect(url.search).toBe('?query=test')
      expect(url.hash).toBe('#section')
    })

    it('应正确修改 URL 参数', () => {
      const url = new URL('https://example.com/path')
      url.searchParams.set('foo', 'bar')
      url.searchParams.set('hello', 'world')
      expect(url.href).toContain('foo=bar')
      expect(url.href).toContain('hello=world')
    })
  })

  describe('边界情况', () => {
    it('应正确处理空字符串', () => {
      const encoded = encodeURIComponent('')
      expect(encoded).toBe('')
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe('')
    })

    it('应正确处理长字符串', () => {
      const longText = 'a'.repeat(10000)
      const encoded = encodeURIComponent(longText)
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe(longText)
    })

    it('应正确处理连续的特殊字符', () => {
      const text = '&&&&'
      const encoded = encodeURIComponent(text)
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe(text)
    })

    it('应正确处理已编码的文本（双重编码）', () => {
      const text = 'hello world'
      const once = encodeURIComponent(text)
      const twice = encodeURIComponent(once)
      expect(twice).not.toBe(once)
      expect(decodeURIComponent(twice)).toBe(once)
      expect(decodeURIComponent(decodeURIComponent(twice))).toBe(text)
    })
  })

  describe('加号处理', () => {
    it('URLSearchParams 应将空格编码为加号', () => {
      const params = new URLSearchParams()
      params.set('text', 'hello world')
      expect(params.toString()).toBe('text=hello+world')
    })

    it('decodeURIComponent 不会将加号解码为空格', () => {
      const encoded = 'hello+world'
      const decoded = decodeURIComponent(encoded)
      expect(decoded).toBe('hello+world') // 加号保持不变
    })

    it('应使用 replace 将加号转换为空格', () => {
      const encoded = 'hello+world'
      const decoded = decodeURIComponent(encoded.replace(/\+/g, ' '))
      expect(decoded).toBe('hello world')
    })
  })
})
