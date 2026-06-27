<script setup lang="ts">
import type { DSEProfileButton } from '@/router/DualSenseEdge/views/_Profile/profile'
import DouSelect from '@/components/base/DouSelect.vue'
import ControllerTextButton from '@/components/common/ControllerTextButton.vue'

const props = defineProps<{
  modelValue: DSEProfileButton[]
  rowLabels: string[]
  options: {
    value: DSEProfileButton
    label: string
  }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: DSEProfileButton[]): void
}>()

function updateMapping(index: number, value: DSEProfileButton) {
  emit('update:modelValue', [
    ...props.modelValue.slice(0, index),
    value,
    ...props.modelValue.slice(index + 1),
  ])
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="(label, index) in rowLabels" :key="`${label}-${index}`" class="assignment-item">
      <ControllerTextButton :text="label" small />
      <div class="i-mingcute-right-line opacity-50" />
      <DouSelect
        :model-value="modelValue[index]"
        :options="options"
        class="min-w-30"
        @update:model-value="(value) => updateMapping(index, value)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.assignment-item {
  @apply flex items-center gap-2;
}
</style>
