<script setup lang="ts">
import type { ModelProps } from '@/device-based-router/shared'
import DSEBack from './_ModelPanel/DSEBack.vue'
import DSEBody from './_ModelPanel/DSEBody.vue'
import DSECover from './_ModelPanel/DSECover.vue'
import DSETop from './_ModelPanel/DSETop.vue'

defineProps<ModelProps>()
</script>

<template>
  <div class="relative w-full">
    <svg viewBox="0 0 1313 1037">
      <!-- placeholder -->
    </svg>
    <svg class="model" viewBox="0 0 1313 1037">
      <DSEBack :show-value="showValue" />
    </svg>
    <svg v-once class="model" viewBox="0 0 1313 1037">
      <DSEBody />
    </svg>
    <svg class="model" viewBox="0 0 1313 1037">
      <DSECover :show-value="showValue" />
    </svg>
    <div class="absolute bottom-0 left-0 right-0 top-0 w-full">
      <DSETop />
    </div>
  </div>
</template>

<style scoped>
svg {
    @apply w-full;
}
svg.model {
    @apply w-full absolute top-0 left-0;
}
</style>
