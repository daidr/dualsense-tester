<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const emit = defineEmits(['hold', 'release'])
const buttonRef = useTemplateRef('buttonRef')

const isPressed = ref(false)

function hold() {
  if (isPressed.value) {
    return
  }
  isPressed.value = true
  emit('hold')
}

function release() {
  if (!isPressed.value) {
    return
  }
  isPressed.value = false
  emit('release')
}

function handlePointerDown(e: PointerEvent) {
  e.preventDefault()
  hold()
  buttonRef.value?.setPointerCapture(e.pointerId)
}

function handlePointerUp(e: PointerEvent) {
  release()
  buttonRef.value?.releasePointerCapture(e.pointerId)
}

function handleKeyDown(e: KeyboardEvent) {
  if(e.repeat) {
    return
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    hold()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    release()
  }
}
</script>

<template>
  <div ref="buttonRef" tabindex="0" role="button" :aria-pressed="isPressed" class="dou-sc-btn" :class="{
    active: isPressed,
  }"
    @pointerdown="handlePointerDown" @pointerup="handlePointerUp" @keydown="handleKeyDown" @keyup="handleKeyUp">
    <template v-if="$slots.default">
      <slot />
    </template>
    <template v-else>
      {{ $t("shared.hold") }}
    </template>
  </div>
</template>

<style scoped lang="scss">
.dou-sc-btn {
  @apply w-auto h-6 text-xs px-2;

  &:hover {
    @apply bg-primary/75;
  }

  &:active, &.active {
    @apply bg-primary text-white scale-90;
  }
}
</style>
