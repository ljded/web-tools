<script setup lang="ts">
import { X } from '@lucide/vue'
import { useSnackbarStore } from '@/stores/snackbar'

const snackbar = useSnackbarStore()
</script>

<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-6 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-6 opacity-0 scale-95"
    >
      <div
        v-if="snackbar.show && snackbar.current"
        class="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg"
        :class="{
          'bg-green-600 text-white': snackbar.current.type === 'success',
          'bg-red-600 text-white': snackbar.current.type === 'error',
          'bg-amber-500 text-white': snackbar.current.type === 'warning',
          'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900': snackbar.current.type === 'info',
        }"
        role="alert"
        :aria-live="snackbar.current.type === 'error' ? 'assertive' : 'polite'"
      >
        <span>{{ snackbar.current.message }}</span>

        <button
          v-if="snackbar.current.action"
          class="ml-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
          @click="snackbar.current.action.handler()"
        >
          {{ snackbar.current.action.label }}
        </button>

        <button
          class="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          @click="snackbar.close()"
          :aria-label="$t('app.close')"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </transition>
  </Teleport>
</template>
