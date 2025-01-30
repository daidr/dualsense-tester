<script setup lang="ts">
import type { ToastInfo } from '.'
import { RenderComponent } from '@/utils/comp.util'
import { computed, onMounted, onUnmounted, ref, toValue } from 'vue'

const props = defineProps<{
  info: ToastInfo
}>()

const emit = defineEmits(['close'])

const DEFAULT_ICONS = {
  success: 'i-mingcute-check-circle-line',
  error: 'i-mingcute-close-circle-line',
  warning: 'i-mingcute-warning-line',
  info: 'i-mingcute-information-line',
}

let timer: number
const paused = ref(false)
const totalTime = ref(0)
const progress = computed(() => {
  if (!props.info.duration)
    return 0
  if (typeof totalTime.value !== 'number')
    return 0

  return (totalTime.value / props.info.duration) * 100
})

function updateProcess() {
  if (paused.value)
    return
  if (typeof props.info.duration !== 'number')
    return
  totalTime.value += 10
  if (totalTime.value > props.info.duration) {
    clearInterval(timer)
    emit('close')
  }
}

const ToastRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (props.info.duration) {
    timer = setInterval(updateProcess, 10)
  }
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div ref="ToastRef" class="toast" @mouseenter="paused = true" @mouseleave="paused = false">
    <div class="toast-icon">
      <div v-if="info.icon" :class="[toValue(info.icon)]" />
      <div v-else :class="DEFAULT_ICONS[info.type || 'info']" />
      <div class="close-btn" @click="$emit('close')">
        <div class="i-mingcute-close-line text-base" />
      </div>
    </div>
    <div class="toast-message">
      <RenderComponent :node="info.content" text-class-name="text-base" />
    </div>
    <div v-if="info.duration" class="toast-progress">
      <div
        :style="{
          width: `${progress}%`,
        }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.toast {
  @apply relative overflow-hidden;
  @apply ring-gray-2 ring-1 dark-ring-gray-7;
  @apply py-1 px-3;
  @apply flex items-center gap-2;
  @apply rounded-3;
  @apply bg-gray-50 dark-bg-gray-8;
  @apply shadow-xl shadow-black/3;

  .close-btn {
    @apply transition;
    @apply opacity-0;
    @apply bg-white ring-gray-2;
    @apply dark-bg-gray-8 dark-ring-gray-7;
    @apply w-5 h-5 ring-1 rounded-md flex items-center justify-center;
    @apply absolute top-1/2 right-1/2 transform-gpu translate-x-1/2 -translate-y-1/2;
    @apply cursor-pointer;

    &:hover {
      @apply bg-white ring-gray-3;
      @apply dark-bg-black dark-ring-gray-6;
    }

    &:active {
      @apply bg-gray-2 ring-gray-4;
      @apply dark-bg-gray-7 dark-ring-gray-5;
    }
  }

  .toast-icon {
    @apply text-lg w-4.5 h-4.5 relative rounded-3;
  }

  &:hover {
    .close-btn {
      @apply opacity-100;
    }
  }

  .toast-progress {
    @apply w-full h-2px absolute bottom-0 left-0;

    div {
      @apply h-full;
      @apply rounded-full bg-gray-4;
    }
  }
}
</style>
