import { describe, it, expect } from 'vitest'

/**
 * JSON 格式化/验证功能测试
 */
describe('JSON 工具逻辑', () => {
  describe('JSON 解析', () => {
    it('应正确解析有效的 JSON', () => {
      const json = '{"name": "John", "age": 30}'
      const parsed = JSON.parse(json)
      expect(parsed).toEqual({ name: 'John', age: 30 })
    })

    it('应正确解析数组', () => {
      const json = '[1, 2, 3, 4, 5]'
      const parsed = JSON.parse(json)
      expect(parsed).toEqual([1, 2, 3, 4, 5])
    })

    it('应正确解析嵌套对象', () => {
      const json = '{"user": {"name": "John", "address": {"city": "NYC"}}}'
      const parsed = JSON.parse(json)
      expect(parsed.user.address.city).toBe('NYC')
    })

    it('应正确解析布尔值', () => {
      const json = '{"active": true, "deleted": false}'
      const parsed = JSON.parse(json)
      expect(parsed.active).toBe(true)
      expect(parsed.deleted).toBe(false)
    })

    it('应正确解析 null', () => {
      const json = '{"value": null}'
      const parsed = JSON.parse(json)
      expect(parsed.value).toBeNull()
    })

    it('应拒绝无效的 JSON', () => {
      const invalid = '{name: "John"}' // 缺少引号
      expect(() => JSON.parse(invalid)).toThrow()
    })

    it('应拒绝包含尾随逗号的 JSON', () => {
      const invalid = '{"name": "John",}' // 尾随逗号
      expect(() => JSON.parse(invalid)).toThrow()
    })
  })

  describe('JSON 格式化', () => {
    it('应正确格式化对象（2 空格缩进）', () => {
      const obj = { name: 'John', age: 30 }
      const formatted = JSON.stringify(obj, null, 2)
      expect(formatted).toBe('{\n  "name": "John",\n  "age": 30\n}')
    })

    it('应正确格式化对象（4 空格缩进）', () => {
      const obj = { name: 'John' }
      const formatted = JSON.stringify(obj, null, 4)
      expect(formatted).toContain('    "name"')
    })

    it('应正确格式化数组', () => {
      const arr = [1, 2, 3]
      const formatted = JSON.stringify(arr, null, 2)
      expect(formatted).toBe('[\n  1,\n  2,\n  3\n]')
    })

    it('应正确格式化嵌套结构', () => {
      const obj = {
        user: {
          name: 'John',
          hobbies: ['reading', 'coding'],
        },
      }
      const formatted = JSON.stringify(obj, null, 2)
      expect(formatted).toContain('"hobbies"')
      expect(formatted).toContain('"reading"')
    })

    it('应支持紧凑格式（无缩进）', () => {
      const obj = { name: 'John', age: 30 }
      const compact = JSON.stringify(obj)
      expect(compact).toBe('{"name":"John","age":30}')
    })
  })

  describe('JSON 验证', () => {
    it('应识别有效的 JSON', () => {
      const valid = '{"name": "John", "age": 30}'
      let isValid = false
      try {
        JSON.parse(valid)
        isValid = true
      } catch {
        isValid = false
      }
      expect(isValid).toBe(true)
    })

    it('应识别无效的 JSON', () => {
      const invalid = '{name: John}'
      let isValid = false
      try {
        JSON.parse(invalid)
        isValid = true
      } catch {
        isValid = false
      }
      expect(isValid).toBe(false)
    })

    it('应识别空字符串为无效', () => {
      const empty = ''
      let isValid = false
      try {
        JSON.parse(empty)
        isValid = true
      } catch {
        isValid = false
      }
      expect(isValid).toBe(false)
    })
  })

  describe('JSON 压缩/美化', () => {
    it('应能压缩格式化的 JSON', () => {
      const formatted = '{\n  "name": "John",\n  "age": 30\n}'
      const compressed = JSON.stringify(JSON.parse(formatted))
      expect(compressed).toBe('{"name":"John","age":30}')
    })

    it('应能美化压缩的 JSON', () => {
      const compressed = '{"name":"John","age":30}'
      const formatted = JSON.stringify(JSON.parse(compressed), null, 2)
      expect(formatted).toContain('\n')
      expect(formatted).toContain('  ')
    })
  })

  describe('特殊值处理', () => {
    it('应正确处理数字', () => {
      const obj = { int: 42, float: 3.14, negative: -10 }
      const json = JSON.stringify(obj)
      const parsed = JSON.parse(json)
      expect(parsed.int).toBe(42)
      expect(parsed.float).toBe(3.14)
      expect(parsed.negative).toBe(-10)
    })

    it('应正确处理字符串转义', () => {
      const obj = { text: 'Line 1\nLine 2\tTabbed' }
      const json = JSON.stringify(obj)
      expect(json).toContain('\\n')
      expect(json).toContain('\\t')
    })

    it('应正确处理 Unicode 字符', () => {
      const obj = { chinese: '你好', emoji: '👋' }
      const json = JSON.stringify(obj)
      const parsed = JSON.parse(json)
      expect(parsed.chinese).toBe('你好')
      expect(parsed.emoji).toBe('👋')
    })

    it('应忽略 undefined 值', () => {
      const obj = { name: 'John', value: undefined }
      const json = JSON.stringify(obj)
      const parsed = JSON.parse(json)
      expect(parsed).not.toHaveProperty('value')
    })

    it('应忽略函数', () => {
      const obj = { name: 'John', fn: () => {} }
      const json = JSON.stringify(obj)
      const parsed = JSON.parse(json)
      expect(parsed).not.toHaveProperty('fn')
    })
  })

  describe('JSON 排序', () => {
    it('应能按键名排序', () => {
      const obj = { z: 3, a: 1, m: 2 }
      const sorted = JSON.stringify(
        obj,
        Object.keys(obj).sort(),
        2
      )
      const keys = Object.keys(JSON.parse(sorted))
      expect(keys).toEqual(['a', 'm', 'z'])
    })
  })

  describe('大型 JSON 处理', () => {
    it('应能处理大数组', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i)
      const json = JSON.stringify(largeArray)
      const parsed = JSON.parse(json)
      expect(parsed.length).toBe(1000)
      expect(parsed[999]).toBe(999)
    })

    it('应能处理深层嵌套', () => {
      const deep = { a: { b: { c: { d: { e: 'value' } } } } }
      const json = JSON.stringify(deep)
      const parsed = JSON.parse(json)
      expect(parsed.a.b.c.d.e).toBe('value')
    })
  })
})
