<script setup lang="ts">
import TextTag from './TextTag.vue';

defineProps<{
  title?: string
  tag?: string
}>()
</script>

<template>
  <div class="dou-sc-container flex flex-col gap-y-1 self-start w-full">
    <div v-if="title" class="dou-sc-title mb-3 mt-2 ml-2">{{ title }} <TextTag v-if="tag" class="text-xs align-middle">
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
    @apply absolute top-0 left-0 w-1 h-full bg-current;
    @apply rounded;
  }
}
</style>
