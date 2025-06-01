<script setup lang="ts">
import type { DSEProfile } from '../profile'
import { computed } from 'vue'
import JoystickPreview from './JoystickSensitivity/JoystickPreview.vue'

const props = defineProps<{
  profile: DSEProfile
}>()

const leftJoystick = computed({
  get: () => {
    return props.profile.leftJoystick
  },
  set: (val) => {
    props.profile.leftJoystick = val
  },
})

const rightJoystick = computed({
  get: () => {
    return props.profile.rightJoystick
  },
  set: (val) => {
    props.profile.rightJoystick = val
  },
})
</script>

<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-2">
      <label class="title">{{ $t('profile_mode.left_joystick') }}</label>
      <JoystickPreview v-model="leftJoystick" />
    </div>
    <hr>
    <div class="flex flex-col gap-2">
      <label class="title">{{ $t('profile_mode.right_joystick') }}</label>
      <JoystickPreview v-model="rightJoystick" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.title {
  @apply text-base font-bold;
}
</style>
