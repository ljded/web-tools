import { ref, type Ref } from 'vue'

export interface FileHandlerOptions {
  maxSize?: number
  accept?: string
}

export interface FileHandler {
  file: Ref<File | null>
  error: Ref<string>
  setFile: (f: File) => boolean
  removeFile: () => void
  formatSize: (bytes: number) => string
}

export function useFileHandler(options: FileHandlerOptions = {}): FileHandler {
  const { maxSize } = options
  const file = ref<File | null>(null)
  const error = ref('')

  function setFile(f: File): boolean {
    error.value = ''
    if (maxSize && f.size > maxSize) {
      error.value = `文件超过 ${formatSize(maxSize)}，无法处理`
      return false
    }
    file.value = f
    return true
  }

  function removeFile() {
    file.value = null
    error.value = ''
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  return {
    file,
    error,
    setFile,
    removeFile,
    formatSize,
  }
}
