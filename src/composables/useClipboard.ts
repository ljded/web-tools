import { ref } from 'vue'
import { copyToClipboard as copyUtil } from '@/utils/clipboard'

export function useClipboard(timeout = 1500) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(text: string, msg?: string): Promise<boolean> {
    const ok = await copyUtil(text)
    if (ok) {
      copied.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { copied.value = false }, timeout)
      try {
        const toast = useToast()
        toast.add({ title: msg || '已复制到剪贴板', color: 'success', duration: 2000 })
      } catch { /* toast may not be available in all contexts */ }
    }
    return ok
  }

  function reset() {
    copied.value = false
    if (timer) { clearTimeout(timer); timer = null }
  }

  return { copied, copy, reset }
}
