<script setup lang="ts" generic="T extends string | number">
import { m } from 'motion-v';

defineProps<{
  sets: {
    label: string
    value: T
  }[]
}>()

const modelValue = defineModel<T>({ required: true })

function onButtonClick(value: T) {
  modelValue.value = value
}

const randomId = Math.random().toString(36).substring(2, 15);
</script>

<template>
  <div class="relative h-1.5rem flex gap-1 rounded-full p-2px dou-sc-colorborder" role="group">
    <button
      v-for="button of sets" :key="button.value" class="relative" :class="{ active: button.value === modelValue }"
      @click="onButtonClick(button.value)"
      :aria-pressed="button.value === modelValue"
    >
      <m.div layout="position" :layout-id="`grouped-button-background-${randomId}`" v-if="button.value === modelValue" class="w-full h-full absolute top-0 start-0 bg-primary rounded-full"></m.div>
      <span class="relative">{{ button.label }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
button {
    @apply transition-colors;
    @apply flex items-center justify-center;
    @apply min-w-2.5em px-2 py-1px text-12px rounded-full;
    @apply text-primary transition-color duration-300;

    &:not(:first-child) {
        @apply -ms-2;
    }

    &.active {
        @apply text-white;
    }
}
</style>
