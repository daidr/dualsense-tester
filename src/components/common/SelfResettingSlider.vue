<script setup lang="ts">
import { useIsRTL } from '@/store/page'
import { useElementBounding } from '@vueuse/core'
import { computed, ref } from 'vue'

const props = defineProps<{
  min: number
  max: number
}>()

const isRTL = useIsRTL()

const modelValue = defineModel<number>({ required: true })

const TrackRef = ref<HTMLDivElement | null>()

const { width } = useElementBounding(TrackRef, {
  windowScroll: false,
})

const factor = computed(() => {
  return width.value / (props.max - props.min)
})

const isIndicatorShown = ref(false)

let startX = 0
function onPointerDown(e: PointerEvent) {
  isIndicatorShown.value = true;
  (e.target as HTMLDivElement).setPointerCapture(e.pointerId)
  startX = e.clientX
}

function onPointerMove(e: PointerEvent) {
  if (!isIndicatorShown.value) {
    return
  }
  const currentX = e.clientX
  let deltaX = (currentX - startX) / factor.value
  if (isRTL.value) {
    deltaX = -deltaX
  }
  const current = modelValue.value + deltaX
  if (current < props.min) {
    modelValue.value = props.min
  }
  else if (current > props.max) {
    modelValue.value = props.max
  }
  else {
    modelValue.value = current
  }
  startX = currentX
}

function onPointerUp(e: PointerEvent) {
  if (!isIndicatorShown.value) {
    return
  }
  isIndicatorShown.value = false;
  (e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
  autoResetModelValue()
}

function autoResetModelValue() {
  let initialSpeed = 1
  const interval = setInterval(() => {
    if (modelValue.value <= 2) {
      modelValue.value = 0
      clearInterval(interval)
    }
    else {
      modelValue.value = Math.max(0, modelValue.value - initialSpeed)
    }
    initialSpeed = initialSpeed + 1
  }, 10)
}
</script>

<template>
  <div
    class="horizontal relative h-2px w-auto" :style="{
      '--current-x': `${((modelValue - props.min) / (props.max - props.min)) * width}px`,
      '--current-percentage': `${((modelValue - props.min) / (props.max - props.min))}`,
    }"
  >
    <div ref="TrackRef" class="full-track" />
    <div class="track" />
    <div class="thumb" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" />
    <Transition name="fade">
      <div v-if="isIndicatorShown" class="indicator">
        {{ modelValue.toFixed(0) }}
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.thumb {
  @apply touch-none;
  @apply cursor-grab;
  @apply w-4 h-4 rounded-full bg-primary absolute transform-gpu;

  &:active {
    @apply cursor-grabbing;
  }
}

.full-track {
  @apply rounded-full dou-sc-autobg absolute;
}

.track {
  @apply bg-primary/60 absolute transform-gpu;
}

.indicator {
  @apply pointer-events-none text-xs;
  @apply absolute rounded-full bg-white dark-bg-black dou-sc-capsule;
  @apply transform-gpu;
}

.horizontal {
  .thumb {
    @apply top-1/2 start-0 -translate-y-1/2 translate-x-[var(--current-x)] rtl--translate-x-[var(--current-x)];
  }

  .full-track {
    @apply h-2px start-2 end-2;
  }

  .track {
    @apply top-0 start-2 end-2 bottom-0 scale-x-[var(--current-percentage)] transform-origin-left rtl-transform-origin-right;
  }

  .indicator {
    @apply -top-8 start-2 px-2;
    @apply translate-x-[calc(var(--current-x)-50%)] rtl--translate-x-[calc(var(--current-x)-50%)];
  }
}
</style>
