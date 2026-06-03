import { beforeAll, vi } from 'vitest'
import 'fake-indexeddb/auto'

// Mock IndexedDB
beforeAll(() => {
  // fake-indexeddb/auto 自动全局注册 IndexedDB
})

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
  configurable: true,
})
