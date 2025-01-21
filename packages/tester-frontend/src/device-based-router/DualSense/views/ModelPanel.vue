<script setup lang="ts">
import type { ModelProps } from '@/device-based-router/shared';
import DSEBack from './ModelPanel/DSBack.vue';
import DSEBody from './ModelPanel/DSBody.vue';
import DSCover from './ModelPanel/DSCover.vue';
// import DSECover from './DSECover.vue';
// import DSETop from './DSETop.vue';

const props = defineProps<ModelProps>()
</script>

<template>
  <div class="relative w-full">
    <svg viewBox="0 0 1117 892">
    </svg>
    <svg class="model" viewBox="0 0 1117 892">
      <DSEBack :show-value="showValue" />
    </svg>
    <svg v-once class="model" viewBox="0 0 1117 892">
      <DSEBody />
    </svg>
    <svg class="model" viewBox="0 0 1117 892">
      <DSCover :show-value="showValue" />
    </svg>
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
