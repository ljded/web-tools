import { useSnackbarStore } from '@/stores/snackbar'

export async function copyToClipboard(text: string, msg = '已复制到剪贴板') {
  try {
    await navigator.clipboard.writeText(text)
    const snackbar = useSnackbarStore()
    snackbar.open(msg)
    return true
  } catch {
    return false
  }
}
