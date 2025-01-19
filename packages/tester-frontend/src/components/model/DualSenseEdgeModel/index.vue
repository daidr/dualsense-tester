<script setup lang="ts">
import type { InnerModelProps } from '../shared';
import DSEBack from './DSEBack.vue';
import DSEBody from './DSEBody.vue';
import DSECover from './DSECover.vue';
import DSETop from './DSETop.vue';

const props = defineProps<InnerModelProps>()
</script>

<template>
    <div class="relative w-full">
        <svg viewBox="0 0 1313 1037">
        </svg>
        <svg class="model" viewBox="0 0 1313 1037">
            <DSEBack :show-value="showValue" :inputVisualInfo="inputVisualInfo" />
        </svg>
        <svg v-once class="model" viewBox="0 0 1313 1037">
            <DSEBody />
        </svg>
        <svg class="model" viewBox="0 0 1313 1037">
            <DSECover :show-value="showValue" :inputVisualInfo="inputVisualInfo" />
        </svg>
        <div class="w-full absolute top-0 left-0 right-0 bottom-0">
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