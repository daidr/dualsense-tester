<script setup lang="ts">
defineProps<{
  text: string
  small?: boolean
}>()
</script>

<template>
  <span
    class="mx-0.5 inline rounded px-1 v-mid text-xs font-bold font-mono" :class="{
      'ring-1.5 ring-current': !small,
      'bg-[color-mix(in_srgb,currentColor,transparent_70%)]': !small,
      'bg-[color-mix(in_srgb,currentColor,transparent_80%)]': small,
    }"
  >
    {{ text }}
  </span>
</template>

<style scoped>
</style>
