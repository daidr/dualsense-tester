<script setup lang="ts">
import { useElementBounding } from '@vueuse/core';
import { ref } from 'vue';

defineProps<{
    title: string
    value: number
}>()

const MAX_RANGE = 1000

const BarRef = ref<HTMLElement | null>(null)
const { width } = useElementBounding(BarRef)

const getCenterPointPos = (value: number) => {
    return value / MAX_RANGE * width.value
}
</script>

<template>
  <div class="flex w-full text-primary">
    <div class="text-current font-bold text-lg w-24">{{ title }}</div>
    <div class="flex-1 relative">
      <div ref="BarRef" class="h-1 rounded-full absolute top-1/2 left-0 w-full transform-gpu -translate-y-1/2">
        <div class="w-2px bg-gray h-1 absolute left-1/2 transform-gpu -translate-x-1/2"></div>
        <div class="w-full h-full bg-current opacity-20"></div>
        <div
          class="w-10px bg-current h-10px absolute left-[calc(50%-5px)] top-1/2 transform-gpu -translate-y-1/2 rounded-full point"
          :style="{ '--un-translate-x': getCenterPointPos(value) + '%' }"></div>
      </div>
    </div>
    <div class="text-current text-lg font-sans w-24 text-right">{{ (value / 10).toFixed(1) }}°/S</div>
  </div>
</template>

<style scoped lang="scss">
.point {
  image-rendering: optimizeSpeed;
  backface-visibility: hidden;
}
</style>
