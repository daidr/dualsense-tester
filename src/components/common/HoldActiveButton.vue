<script setup lang="ts">
import { useTemplateRef } from 'vue'

const emit = defineEmits(['hold', 'release'])
const buttonRef = useTemplateRef('buttonRef')

function hold() {
  emit('hold')
}

function release() {
  emit('release')
}

function handlePointerDown(e: PointerEvent) {
  e.preventDefault()
  hold()
  buttonRef.value?.setPointerCapture(e.pointerId)
}

function handlePointerUp(e: PointerEvent) {
  e.preventDefault()
  release()
  buttonRef.value?.releasePointerCapture(e.pointerId)
}
</script>

<template>
  <button ref="buttonRef" class="dou-sc-btn" @pointerdown="handlePointerDown" @pointerup="handlePointerUp">
    <template v-if="$slots.default">
      <slot />
    </template>
    <template v-else>
      {{ $t("shared.hold") }}
    </template>
  </button>
</template>

<style scoped lang="scss">
.dou-sc-btn {
  @apply w-auto h-6 text-xs px-2;

  &:hover {
    @apply bg-primary/75;
  }

  &:active {
    @apply bg-primary;
  }
}
</style>
