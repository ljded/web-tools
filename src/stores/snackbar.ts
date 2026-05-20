import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSnackbarStore = defineStore('snackbar', () => {
  const show = ref(false)
  const message = ref('')

  function open(msg: string) {
    message.value = msg
    show.value = true
  }

  function close() {
    show.value = false
  }

  return { show, message, open, close }
})
