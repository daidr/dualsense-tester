<script setup lang="ts">
import { useElementBounding } from '@vueuse/core';
import { computed, ref } from 'vue';

const modelValue = defineModel<number>({ required: true })

const props = withDefaults(defineProps<{
  min: number,
  max: number,
  digits?: number,
  vertical?: boolean
}>(), {
  digits: 0,
  vertical: false
})

const TrackRef = ref<HTMLDivElement | null>()

const { width, height } = useElementBounding(TrackRef, {
  windowScroll: false
})

const factor = computed(() => {
  if (props.vertical) {
    return height.value / (props.max - props.min)
  }
  return width.value / (props.max - props.min)
})

const isIndicatorShown = ref(false)

let start = 0
const onPointerDown = (e: PointerEvent) => {
  isIndicatorShown.value = true;
  (e.target as HTMLDivElement).setPointerCapture(e.pointerId)
  if (props.vertical) {
    start = e.clientY
  } else {
    start = e.clientX
  }
}

const onPointerMove = (e: PointerEvent) => {
  if (!isIndicatorShown.value) {
    return
  }
  if (props.vertical) {
    const currentY = e.clientY
    const deltaY = (start - currentY) / factor.value
    const current = modelValue.value + deltaY
    if (current < props.min) {
      modelValue.value = props.min
    } else if (current > props.max) {
      modelValue.value = props.max
    } else {
      modelValue.value = current
    }
    start = currentY
    return
  }
  const currentX = e.clientX
  const deltaX = (currentX - start) / factor.value
  const current = modelValue.value + deltaX
  if (current < props.min) {
    modelValue.value = props.min
  } else if (current > props.max) {
    modelValue.value = props.max
  } else {
    modelValue.value = current
  }
  start = currentX
}

const onPointerUp = (e: PointerEvent) => {
  if (!isIndicatorShown.value) {
    return
  }
  isIndicatorShown.value = false;
  (e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
}
</script>

<template>
  <div ref="TrackRef" class="w-auto h-2px rounded-full relative dou-sc-autobg" :class="{
    'vertical': vertical
  }" :style="vertical ?
    {
      '--current-y': height - ((modelValue - props.min) / (props.max - props.min)) * height + 'px'
    }
    : {
      '--current-x': ((modelValue - props.min) / (props.max - props.min)) * width + 'px'
    }">
    <div class="track"></div>
    <div class="thumb" @pointerdown.passive="onPointerDown" @pointermove.passive="onPointerMove"
      @pointerup.passive="onPointerUp"></div>
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
  @apply w-4 h-4 rounded-full bg-primary absolute top-1/2 -left-2 transform-gpu translate-x-[var(--current-x)] -translate-y-1/2;
  &:active {
    @apply cursor-grabbing;
  }
}

.track {
  @apply bg-primary/60 absolute top-0 left-0 bottom-0 w-[var(--current-x)];
}

.indicator {
  @apply pointer-events-none text-xs;
  @apply absolute -top-8 left-0 px-2 rounded-full bg-white dark-bg-black dou-sc-capsule;
  @apply transform-gpu translate-x-[calc(var(--current-x)-50%)];
}

.vertical {
  @apply h-100% w-2px;

  .indicator {
    @apply top-2 -left-10 -translate-x-1/2 translate-y-[calc(var(--current-y)-100%)];
  }

  .track {
    @apply w-unset absolute bottom-0 h-[calc(100% - var(--current-y))];
  }

  .thumb {
    @apply top-2 left-1/2 translate-y-[calc(var(--current-y)-100%)] -translate-x-1/2;
  }
}
</style>
