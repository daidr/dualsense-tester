<script setup lang="ts">
import ControllerTextButton from '@/components/common/ControllerTextButton.vue';
import { DSEProfileSwitchButton } from './profile'

defineProps<{
  button: DSEProfileSwitchButton
}>()

function getProfileKey(button: DSEProfileSwitchButton) {
  switch (button) {
    case DSEProfileSwitchButton.Triangle:
      return 'i-icon-park-twotone-handle-triangle'
    case DSEProfileSwitchButton.Circle:
      return 'i-icon-park-twotone-handle-round'
    case DSEProfileSwitchButton.Cross:
      return 'i-icon-park-twotone-handle-x'
    case DSEProfileSwitchButton.Square:
      return 'i-icon-park-twotone-handle-square'
    default:
      return ''
  }
}
</script>

<template>
  <div class="key-icon flex flex-shrink-0 select-none items-center gap-1">
    <ControllerTextButton text="Fn" />
    <span class="font-bold">+</span>
    <div class="text-xl" :class="getProfileKey(button)" />
  </div>
</template>

<style scoped></style>
