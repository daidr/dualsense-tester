<script setup lang="ts">
import { useElementBounding } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useIsRTL } from '@/store/page'

const props = withDefaults(defineProps<{
  min: number
  max: number
  digits?: number
  vertical?: boolean
  startPoint?: number
  disabled?: boolean
}>(), {
  digits: 0,
  vertical: false,
})

defineSlots<{
  default: (props: { value: number }) => any
}>()

const isRTL = useIsRTL()

const modelValue = defineModel<number>({ required: true })

const range = computed(() => props.max - props.min)

const TrackRef = ref<HTMLDivElement | null>()

const validStartPoint = computed(() => {
  if (props.startPoint !== undefined) {
    const inRange = props.startPoint >= props.min && props.startPoint <= props.max
    if (inRange) {
      return props.startPoint
    }
  }
  return props.min
})

const { width, height } = useElementBounding(TrackRef, {
  windowScroll: false,
})

const factor = computed(() => {
  if (props.vertical) {
    return height.value / range.value
  }
  return width.value / range.value
})

const isIndicatorShown = ref(false)

let start = 0
let startValue = 0
function onPointerDown(e: PointerEvent) {
  if (props.disabled) {
    e.preventDefault()
    return
  }
  isIndicatorShown.value = true;
  (e.target as HTMLDivElement).setPointerCapture(e.pointerId)
  if (props.vertical) {
    start = e.clientY
  }
  else {
    start = e.clientX
  }
  startValue = modelValue.value
}

function roundToNearest(value: number, digits: number) {
  const step = 10 ** digits
  return Math.round(value * step) / step
}

function onPointerMove(e: PointerEvent) {
  if (!isIndicatorShown.value) {
    return
  }
  if (props.vertical) {
    const currentY = e.clientY
    const deltaY = (start - currentY) / factor.value
    const current = roundToNearest(startValue + deltaY, props.digits)
    if (current < props.min) {
      modelValue.value = props.min
    }
    else if (current > props.max) {
      modelValue.value = props.max
    }
    else {
      modelValue.value = current
    }
    return
  }
  const currentX = e.clientX
  let deltaX = (currentX - start) / factor.value
  if (isRTL.value) {
    deltaX = -deltaX
  }
  const current = roundToNearest(startValue + deltaX, props.digits)
  if (current < props.min) {
    modelValue.value = props.min
  }
  else if (current > props.max) {
    modelValue.value = props.max
  }
  else {
    modelValue.value = current
  }
}

function onPointerUp(e: PointerEvent) {
  if (!isIndicatorShown.value) {
    return
  }
  isIndicatorShown.value = false;
  (e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
}

function getTrackScalePercentage() {
  const currentRange = modelValue.value - validStartPoint.value
  if (modelValue.value > validStartPoint.value) {
    const range = props.max - validStartPoint.value
    return currentRange / range
  }
  else if (modelValue.value < validStartPoint.value) {
    const range = validStartPoint.value - props.min
    return currentRange / range
  }
  return 0
}
</script>

<template>
  <div
    class="relative h-2px w-auto" :class="{
      vertical,
      horizontal: !vertical,
      disabled: props.disabled,
    }" :style="vertical
      ? {
        '--current-y': `${height - ((modelValue - props.min) / range) * height}px`,
        '--current-percentage': `${((modelValue - props.min) / range)}`,
      }
      : {
        '--current-x': `${((modelValue - props.min) / range) * width}px`,
        '--current-percentage': `${((modelValue - props.min) / range)}`,
        '--start-point-percentage': `${((validStartPoint - props.min) / range * 100)}%`,
        '--track-scale-percentage': getTrackScalePercentage(),
      }"
  >
    <div ref="TrackRef" class="full-track">
      <div class="track" />
    </div>

    <div
      class="thumb" role="slider" :aria-valuenow="modelValue" :aria-valuemin="props.min" :aria-valuemax="props.max"
      tabindex="0" @pointerdown="onPointerDown" @pointermove.passive="onPointerMove"
      @pointerup="onPointerUp"
    />
    <Transition name="fade">
      <div v-if="isIndicatorShown" class="indicator">
        <template v-if="$slots.default">
          <slot :value="modelValue" />
        </template>
        <template v-else>
          {{ modelValue }}
        </template>
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
  @apply rounded-full dou-sc-autobg absolute overflow-hidden;
}

.track {
  @apply rounded-full bg-primary/50 absolute transform-gpu;
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
    @apply top-0 bottom-0 start-[var(--start-point-percentage)] end-0 scale-x-[var(--track-scale-percentage)] transform-origin-left rtl-transform-origin-right;
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
    @apply w-2px scale-y-[var(--current-percentage)] transform-origin-bottom bottom-0 top-0;
  }

  .thumb {
    @apply top-2 start-1/2 translate-y-[calc(var(--current-y)-50%)] -translate-x-1/2 rtl-translate-x-1/2;
  }
}

.disabled {
  @apply cursor-not-allowed;

  .thumb {
    @apply cursor-not-allowed;
    // @apply bg-gray-400 dark-bg-gray-700;
  }

  // .track {
  //   @apply bg-gray-300 dark-bg-gray-600;
  // }

  // .full-track {
  //   @apply bg-gray-200/50 dark-bg-gray-600/50;
  // }
}
</style>
