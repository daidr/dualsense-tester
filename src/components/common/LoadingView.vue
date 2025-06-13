<script setup lang="ts">
import { m } from 'motion-v'

defineProps<{
  h?: number
}>()
</script>

<template>
  <m.div
    class="flex items-center justify-center text-xl" :style="{
      height: h ? `${h}px` : undefined,
    }"
  >
    <div class="i-mingcute-loading-3-fill animate-spin" />
  </m.div>
</template>

<style scoped></style>
