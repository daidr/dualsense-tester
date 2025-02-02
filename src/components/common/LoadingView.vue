<script setup lang="ts">
defineProps<{
  h?: number
}>()
</script>

<template>
  <div
    class="h-full flex items-center justify-center text-xl" :style="{
      height: h ? `${h}px` : undefined,
    }"
  >
    <div class="i-mingcute-loading-3-fill animate-spin" />
  </div>
</template>

<style scoped></style>
