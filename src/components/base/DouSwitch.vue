<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

defineProps<{
  disabled?: boolean
}>()

const state = defineModel<boolean>()
</script>

<template>
  <SwitchRoot v-model="state" :disabled="disabled" class="switch-root">
    <SwitchThumb class="switch-thumb" />
  </SwitchRoot>
</template>

<style lang="scss" scoped>
.switch-root {
  @apply w-[32px] h-[20px] rounded-full relative flex;
  @apply dou-sc-autoborder transition-colors;

  &[data-state=unchecked] {
    @apply bg-stone-300 dark:bg-stone-800;
  }

  &[data-state=checked] {
    @apply bg-primary border-primary;
  }

  &[data-disabled] {
    @apply opacity-70 cursor-not-allowed;
  }
}

.switch-thumb {
  @apply w-3.5 h-3.5 my-auto bg-white text-xs flex items-center justify-center;
  @apply will-change-transform transition-transform translate-x-0.5;
  @apply shadow-xl rounded-full;

  &[data-state=checked] {
    @apply translate-x-full;
  }
}
</style>
