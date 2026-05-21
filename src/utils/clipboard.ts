import { useSnackbarStore } from '@/stores/snackbar'
import { i18n } from '@/i18n'

export async function copyToClipboard(text: string, msg?: string) {
  try {
    await navigator.clipboard.writeText(text)
    const snackbar = useSnackbarStore()
    snackbar.open(msg || i18n.global.t('app.copySuccess'))
    return true
  } catch {
    return false
  }
}
