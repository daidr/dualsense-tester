<script setup lang="ts">

import { DualSenseType, type DeviceItem } from '@/dualsense/types';
import { useDualSenseStore } from '@/store/dualsense';
import { storeToRefs } from 'pinia';
import { computed, defineAsyncComponent } from 'vue';

const dualsenseStore = useDualSenseStore();
const { currentDevice,inputVisualInfo } = storeToRefs(dualsenseStore);

const MODELS = {
    // [DualSenseType.DualSense]: defineAsyncComponent(() => import('./DualSenseModel/index.vue')),
    [DualSenseType.DualSense]: defineAsyncComponent(() => import('./DualSenseEdgeModel/index.vue')),
    [DualSenseType.DualSenseEdge]: defineAsyncComponent(() => import('./DualSenseEdgeModel/index.vue')),
}

const getCurrentModel = (deviceItem?: DeviceItem) => {
    if (!deviceItem?.type || deviceItem.type === DualSenseType.Unknown) return null;
    return MODELS[deviceItem.type]
}

defineProps<{
    showValue: boolean
}>()
</script>

<template>
    <component :is="getCurrentModel(currentDevice)" :show-value="showValue" :input-visual-info="inputVisualInfo" />
</template>

<style scoped>

</style>