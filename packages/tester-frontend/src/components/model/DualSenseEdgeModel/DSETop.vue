<script setup lang="ts">

import { getInputOffset } from '@/dualsense/utils';
import { useDualSenseStore } from '@/store/dualsense';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const { inputReport, currentDevice } = storeToRefs(useDualSenseStore());

const isStickModuleLost = computed(() => {
    if (!inputReport.value || !currentDevice.value) {
        return false;
    }
    const offset = getInputOffset(currentDevice.value.connectionType).triggerLevel;
    return (inputReport.value.getUint8(offset) & 15) !== 0;
});
</script>

<template>
    <div v-if="isStickModuleLost"
        class="px-2 py-1 rounded-2xl bg-red-7/20 text-red-7 ring-2 ring-current inline-block absolute left-1/2 top-6% flex items-center gap-2 transform -translate-x-1/2">
        <div class="i-mingcute-warning-line"></div>
        未找到摇杆模块
    </div>
</template>

<style scoped></style>