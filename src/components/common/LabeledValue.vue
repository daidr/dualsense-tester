<script setup lang="ts">
defineProps({
  label: String,
})

defineSlots<{
  default: () => any
}>()
</script>

<template>
  <div class="labeled-value flex justify-between gap-2 rounded-lg px-1 text-sm">
    <div class="flex-shrink-0 select-none font-bold">
      {{ label }}
    </div>
    <div class="flex-grow whitespace-pre-wrap break-all text-end font-mono opacity-80">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.labeled-value {
    @apply transform-gpu;
    &:hover {
        @apply bg-primary/10 dark-bg-primary/30;
    }
}
</style>
