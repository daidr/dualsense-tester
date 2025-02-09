<script setup lang="ts">
import TextTag from './TextTag.vue'

defineProps<{
  title?: string
  tag?: string
}>()
</script>

<template>
  <div class="w-full flex flex-col self-start gap-y-1 dou-sc-container">
    <div v-if="title" class="mb-3 ms-2 mt-2 flex items-center gap-2 dou-sc-title">
      {{ title }}
      <TextTag v-if="tag" class="align-middle text-xs">
        {{ tag }}
      </TextTag>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.dou-sc-title {
  @apply ps-2 relative select-none;

  &::before {
    @apply text-current content-empty;
    @apply absolute top-0 start-0 w-1 h-full bg-current;
    @apply rounded;
  }
}
</style>
