<script setup lang="ts">
import { useIsRTL, usePageStore } from '@/store/page'
import { useElementBounding } from '@vueuse/core'
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  min: number
  max: number
  digits?: number
  vertical?: boolean
}>(), {
  digits: 0,
  vertical: false,
})

const isRTL = useIsRTL()

const modelValue = defineModel<number>({ required: true })

const TrackRef = ref<HTMLDivElement | null>()

const { width, height } = useElementBounding(TrackRef, {
  windowScroll: false,
})

const factor = computed(() => {
  if (props.vertical) {
    return height.value / (props.max - props.min)
  }
  return width.value / (props.max - props.min)
})

const isIndicatorShown = ref(false)

let start = 0
function onPointerDown(e: PointerEvent) {
  isIndicatorShown.value = true;
  (e.target as HTMLDivElement).setPointerCapture(e.pointerId)
  if (props.vertical) {
    start = e.clientY
  }
  else {
    start = e.clientX
  }
}

function onPointerMove(e: PointerEvent) {
  if (!isIndicatorShown.value) {
    return
  }
  if (props.vertical) {
    const currentY = e.clientY
    const deltaY = (start - currentY) / factor.value
    const current = modelValue.value + deltaY
    if (current < props.min) {
      modelValue.value = props.min
    }
    else if (current > props.max) {
      modelValue.value = props.max
    }
    else {
      modelValue.value = current
    }
    start = currentY
    return
  }
  const currentX = e.clientX
  let deltaX = (currentX - start) / factor.value
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
  start = currentX
}

function onPointerUp(e: PointerEvent) {
  if (!isIndicatorShown.value) {
    return
  }
  isIndicatorShown.value = false;
  (e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
}
</script>

<template>
  <div
    class="relative h-2px w-auto" :class="{
      vertical,
      horizontal: !vertical,
    }" :style="vertical
      ? {
        '--current-y': `${height - ((modelValue - props.min) / (props.max - props.min)) * height}px`,
        '--current-percentage': `${((modelValue - props.min) / (props.max - props.min))}`,
      }
      : {
        '--current-x': `${((modelValue - props.min) / (props.max - props.min)) * width}px`,
        '--current-percentage': `${((modelValue - props.min) / (props.max - props.min))}`,
      }"
  >
    <div ref="TrackRef" class="full-track" />
    <div class="track" />
    <div
      class="thumb" @pointerdown.passive="onPointerDown" @pointermove.passive="onPointerMove"
      @pointerup.passive="onPointerUp"
    />
    <Transition name="fade">
      <div v-if="isIndicatorShown" class="indicator">
        {{ modelValue.toFixed(digits) }}
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

.vertical {
  @apply h-100% w-2px;

  .indicator {
    @apply top-2 -start-10 translate-y-[calc(var(--current-y)-50%)] -translate-x-1/2 rtl-translate-x-1/2;
  }

  .full-track {
    @apply w-2px top-2 bottom-2;
  }

  .track {
    @apply bottom-2 top-2 w-2px scale-y-[var(--current-percentage)] transform-origin-bottom;
  }

  .thumb {
    @apply top-2 start-1/2 translate-y-[calc(var(--current-y)-50%)] -translate-x-1/2 rtl-translate-x-1/2;
  }
}
</style>
