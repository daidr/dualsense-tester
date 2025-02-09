<script setup lang="ts">
import { useElementBounding } from '@vueuse/core'
import { ref } from 'vue'

defineProps<{
  title: string
  value: number
}>()

const MAX_RANGE = 1000

const BarRef = ref<HTMLElement | null>(null)
const { width } = useElementBounding(BarRef)

function getCenterPointPos(value: number) {
  return value / MAX_RANGE * width.value
}
</script>

<template>
  <div class="w-full flex text-primary">
    <div class="w-24 text-lg text-current font-bold">
      {{ title }}
    </div>
    <div class="relative flex-1">
      <div ref="BarRef" class="absolute left-0 top-1/2 h-1 w-full transform-gpu rounded-full -translate-y-1/2">
        <div class="absolute left-1/2 h-1 w-2px transform-gpu bg-gray -translate-x-1/2" />
        <div class="h-full w-full bg-current opacity-20" />
        <div
          class="point absolute left-[calc(50%-5px)] top-1/2 h-10px w-10px transform-gpu rounded-full bg-current -translate-y-1/2"
          :style="{ '--un-translate-x': `${getCenterPointPos(value)}%` }"
        />
      </div>
    </div>
    <div class="w-24 text-end text-lg text-current font-sans">
      {{ (value / 10).toFixed(1) }}°/S
    </div>
  </div>
</template>

<style scoped lang="scss">
.point {
  image-rendering: optimizeSpeed;
  backface-visibility: hidden;
}
</style>
