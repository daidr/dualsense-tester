<script setup lang="ts" generic="T extends string | number">
import { m } from 'motion-v'

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

const randomId = Math.random().toString(36).substring(2, 15)
</script>

<template>
  <div class="relative h-1.5rem flex gap-1 dou-sc-colorborder rounded-full p-2px" role="group">
    <button
      v-for="button of sets" :key="button.value" class="relative" :class="{ active: button.value === modelValue }"
      :aria-pressed="button.value === modelValue"
      @click="onButtonClick(button.value)"
    >
      <m.div v-if="button.value === modelValue" layout="position" :layout-id="`grouped-button-background-${randomId}`" class="absolute start-0 top-0 h-full w-full rounded-full bg-primary" />
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
