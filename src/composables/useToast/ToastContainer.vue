<script setup lang="ts">
import type { ToastInfo } from './'
import Toast from './Toast.vue'

defineProps<{
  toasts: ToastInfo[]
}>()

const emit = defineEmits<{
  close: [toast: ToastInfo]
}>()

function handleClose(toast: ToastInfo) {
  emit('close', toast)
}
</script>

<template>
  <Teleport to="#teleport-container">
    <TransitionGroup name="toast" tag="div" class="toast-transition-group">
      <Toast v-for="toast of toasts" :key="toast._id" :info="toast" @close="handleClose(toast)" />
    </TransitionGroup>
  </Teleport>
</template>

<style lang="scss" scoped>
.toast-transition-group {
  @apply fixed top-10 left-1/2 transform-gpu -translate-x-1/2 z-110;
  @apply flex flex-col items-center gap-1;
}

@media (prefers-reduced-motion: no-preference) {
  .toast-move,
  .toast-enter-active,
  .toast-leave-active {
    @apply transition duration-300;
  }

  .toast-enter-from,
  .toast-leave-to {
    @apply opacity-0 transform-gpu -translate-x-10;
  }
}
</style>
