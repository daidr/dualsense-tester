<script setup lang="ts">
import type { InnerModelProps } from '../shared';
import DSEBack from './DSEBack.vue';
import DSEBody from './DSEBody.vue';

const props = defineProps<InnerModelProps>()
</script>

<template>
    <div class="relative w-full">
        <svg viewBox="0 0 1313 1037">
        </svg>
        <svg class="model" viewBox="0 0 1313 1037">
            <DSEBack :inputVisualInfo="inputVisualInfo" />
        </svg>
        <svg class="model" v-once viewBox="0 0 1313 1037">
            <DSEBody />
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