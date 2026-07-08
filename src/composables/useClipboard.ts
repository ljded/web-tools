import { computed, ref } from 'vue'

export function useClipboard(timeout = 1500) {
  const copied = ref(false)
  const isSupported = computed(() => typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText))
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(text: string, msg?: string): Promise<boolean> {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is not supported')
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, timeout)
    if (msg) {
      try {
        const toast = useToast()
        toast.add({ title: msg, color: 'success', duration: 2000 })
      } catch { /* toast may not be available in all contexts */ }
    }
    return true
  }

  async function read(): Promise<string> {
    if (!navigator.clipboard?.readText) throw new Error('Clipboard API is not supported')
    return navigator.clipboard.readText()
  }

  function reset() {
    copied.value = false
    if (timer) { clearTimeout(timer); timer = null }
  }

  return { copied, isSupported, copy, read, reset }
}
