<script setup lang="ts">
import { formatAccel } from '@/utils/format.util'

defineProps<{
  title: string
  value: number
}>()
</script>

<template>
  <div class="w-full flex justify-between font-sans">
    <p class="text-current font-bold">
      {{ title }}
    </p>
    <p class="w-1/2 text-end text-current">
      <span class="changed-value">{{ formatAccel(value) }} m/s²</span>
    </p>
  </div>
</template>

<style scoped lang="scss">
.changed-value {
  @apply contain-strict text-lg font-mono h-full w-full inline-block;
}
</style>
