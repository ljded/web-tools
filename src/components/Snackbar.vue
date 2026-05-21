<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  show: boolean
  message: string
}>()
const emit = defineEmits<{ (e: 'update:show', v: boolean): void }>()

let timer: ReturnType<typeof setTimeout>
watch(
  () => props.show,
  (val) => {
    clearTimeout(timer)
    if (val) {
      timer = setTimeout(() => emit('update:show', false), 2500)
    }
  },
)
</script>

<template>
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-6 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-6 opacity-0"
  >
    <div
      v-if="show"
      class="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-inverse-surface px-6 py-3 text-sm font-medium text-inverse-on-surface shadow-lg"
    >
      {{ message }}
    </div>
  </transition>
</template>
