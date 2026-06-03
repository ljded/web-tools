import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClipboard } from '../useClipboard'

describe('useClipboard', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(() => Promise.resolve()),
        readText: vi.fn(() => Promise.resolve('clipboard content')),
      },
      writable: true,
      configurable: true,
    })
  })

  it('应能复制文本到剪贴板', async () => {
    const { copy } = useClipboard()
    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText')

    await copy('test text')

    expect(writeTextMock).toHaveBeenCalledWith('test text')
  })

  it('应能从剪贴板读取文本', async () => {
    const { read } = useClipboard()
    const readTextMock = vi.spyOn(navigator.clipboard, 'readText')

    const text = await read()

    expect(readTextMock).toHaveBeenCalled()
    expect(text).toBe('clipboard content')
  })

  it('应提供 isSupported 状态', () => {
    const { isSupported } = useClipboard()

    // 在测试环境中，mock 了 clipboard API，所以应该支持
    expect(typeof isSupported.value).toBe('boolean')
  })

  it('应正确处理复制失败', async () => {
    const { copy } = useClipboard()
    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('Copy failed')
    )

    await expect(copy('test')).rejects.toThrow('Copy failed')
    expect(writeTextMock).toHaveBeenCalled()
  })

  it('应正确处理读取失败', async () => {
    const { read } = useClipboard()
    const readTextMock = vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(
      new Error('Read failed')
    )

    await expect(read()).rejects.toThrow('Read failed')
    expect(readTextMock).toHaveBeenCalled()
  })

  it('应能复制空字符串', async () => {
    const { copy } = useClipboard()
    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText')

    await copy('')

    expect(writeTextMock).toHaveBeenCalledWith('')
  })

  it('应能复制包含特殊字符的文本', async () => {
    const { copy } = useClipboard()
    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText')

    const specialText = 'Line 1\nLine 2\tTabbed\r\nWindows line'
    await copy(specialText)

    expect(writeTextMock).toHaveBeenCalledWith(specialText)
  })

  it('应能复制 Unicode 字符', async () => {
    const { copy } = useClipboard()
    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText')

    const unicodeText = '你好世界 🌍 emoji test'
    await copy(unicodeText)

    expect(writeTextMock).toHaveBeenCalledWith(unicodeText)
  })
})
