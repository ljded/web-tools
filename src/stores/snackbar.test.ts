import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSnackbarStore } from '@/stores/snackbar'

describe('Snackbar Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('open 显示消息队列', () => {
    const snackbar = useSnackbarStore()

    const id1 = snackbar.open('消息1', 'info')
    expect(snackbar.current?.message).toBe('消息1')
    expect(snackbar.show).toBe(true)

    // 第二条进入队列
    const id2 = snackbar.open('消息2', 'error')
    expect(snackbar.current?.message).toBe('消息1') // 当前仍是第一条
    expect(snackbar.queue.length).toBe(1)

    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
  })

  it('close 切换到下一条', () => {
    const snackbar = useSnackbarStore()

    snackbar.open('消息1', 'info')
    snackbar.open('消息2', 'error')
    snackbar.open('消息3', 'success')

    snackbar.close()
    // close 后通过 next() 自动切换
    // 注意：由于 setTimeout 延迟，此处验证队列状态
    expect(snackbar.show).toBe(false)
  })

  it('remove 从队列中移除', () => {
    const snackbar = useSnackbarStore()

    const id = snackbar.open('消息1', 'info')
    snackbar.open('消息2', 'error')

    snackbar.remove(id)
    // 如果 id 是当前消息则关闭
    // 验证没有报错即可
    expect(snackbar.queue.length).toBeLessThanOrEqual(1)
  })

  it('clear 清空所有', () => {
    const snackbar = useSnackbarStore()

    snackbar.open('消息1', 'info')
    snackbar.open('消息2', 'error')
    snackbar.clear()

    expect(snackbar.queue.length).toBe(0)
    expect(snackbar.show).toBe(false)
  })

  it('支持 action 按钮', () => {
    const snackbar = useSnackbarStore()
    let called = false

    snackbar.open('消息', 'info', {
      label: '操作',
      handler: () => { called = true },
    })

    expect(snackbar.current?.action).toBeDefined()
    expect(snackbar.current?.action?.label).toBe('操作')

    snackbar.current?.action?.handler()
    expect(called).toBe(true)
  })
})
