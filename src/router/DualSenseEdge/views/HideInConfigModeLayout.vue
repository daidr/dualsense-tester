<script setup lang="ts">
import { useInNormalMode } from '../_utils/composable.util'

defineSlots<{
  default: () => void
}>()

const isNormalMode = useInNormalMode()
</script>

<template>
  <slot v-if="isNormalMode" />
  <div
    v-else
    class="mx-1px my-1px rounded-24px bg-orange/20 px-2 py-1 text-start text-sm text-orange ring-1 ring-orange/50"
  >
    <p>
      {{ $t('profile_mode.abnormal_tips') }} <button class="inline underline underline-current/10 underline-dotted">
        {{ $t('profile_mode.try_exit') }}
      </button>
    </p>
  </div>
</template>

<style scoped></style>
