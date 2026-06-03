import { ref, type Ref } from 'vue'
import { fileToBase64Stream, shouldUseStreaming } from '@/utils/stream'

export interface FileHandlerOptions {
  maxSize?: number
  accept?: string
  /** 是否启用流式处理（用于大文件） */
  enableStreaming?: boolean
}

export interface FileHandler {
  file: Ref<File | null>
  error: Ref<string>
  progress: Ref<number>
  isProcessing: Ref<boolean>
  setFile: (f: File) => boolean
  removeFile: () => void
  formatSize: (bytes: number) => string
  /** 将文件转换为 Base64（支持流式处理） */
  toBase64: () => Promise<string>
}

export function useFileHandler(options: FileHandlerOptions = {}): FileHandler {
  const { maxSize, enableStreaming = true } = options
  const file = ref<File | null>(null)
  const error = ref('')
  const progress = ref(0)
  const isProcessing = ref(false)

  function setFile(f: File): boolean {
    error.value = ''
    progress.value = 0

    if (maxSize && f.size > maxSize) {
      error.value = '__file_error:too_large'
      return false
    }
    file.value = f
    return true
  }

  function removeFile() {
    file.value = null
    error.value = ''
    progress.value = 0
    isProcessing.value = false
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  async function toBase64(): Promise<string> {
    if (!file.value) {
      throw new Error('No file selected')
    }

    isProcessing.value = true
    progress.value = 0
    error.value = ''

    try {
      // 判断是否使用流式处理
      const useStream = enableStreaming && shouldUseStreaming(file.value.size, 'base64-encode')

      if (useStream) {
        // 使用流式处理（大文件）
        const base64 = await fileToBase64Stream(
          file.value,
          (p) => {
            progress.value = p
          }
        )
        return base64
      } else {
        // 使用传统方法（小文件）
        const buffer = await file.value.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''

        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]!)
          if (i % 100000 === 0) {
            progress.value = Math.round((i / bytes.length) * 100)
          }
        }

        progress.value = 100
        return btoa(binary)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Conversion failed'
      throw e
    } finally {
      isProcessing.value = false
    }
  }

  return {
    file,
    error,
    progress,
    isProcessing,
    setFile,
    removeFile,
    formatSize,
    toBase64,
  }
}
