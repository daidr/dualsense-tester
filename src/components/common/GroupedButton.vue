<script setup lang="ts" generic="T extends string | number">
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
</script>

<template>
  <div class="relative h-1.5rem flex gap-1 rounded-full p-2px dou-sc-colorborder" role="group">
    <button
      v-for="button of sets" :key="button.value" :class="{ active: button.value === modelValue }"
      @click="onButtonClick(button.value)"
      :aria-pressed="button.value === modelValue"
    >
      {{ button.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
button {
    @apply transition-colors;
    @apply flex items-center justify-center;
    @apply min-w-2.5em px-2 py-1px text-12px rounded-full;
    @apply text-primary;

    &:not(:first-child) {
        @apply -ms-2;
    }

    &.active {
        @apply bg-primary text-white;
    }
}
</style>
