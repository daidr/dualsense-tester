<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import DualSenseModel from './DualSenseModel.vue';
import AccelValueBar from './AccelValueBar.vue';
import { storeToRefs } from 'pinia';
import Cube3D from './common/Cube3D.vue';
const dualsenseStore = useDualSenseStore();
const { state } = storeToRefs(dualsenseStore)

const test = (num: number) => num
</script>

<template>
    <div v-if="!dualsenseStore.isConnected"
        class="h-full flex items-center justify-center text-lg text-primary/70 select-none">
        {{ $t('info_panel.tips') }}
    </div>
    <div v-else class="flex flex-col items-center max-w-500px mx-auto">
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_buttons') }}</h1>
        <DualSenseModel />
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_gyroscope') }}</h1>
        <AccelValueBar :title="$t('info_panel.pitch')" :value="state.axes.gyroX" />
        <AccelValueBar :title="$t('info_panel.yaw')" :value="state.axes.gyroY" />
        <AccelValueBar :title="$t('info_panel.roll')" :value="state.axes.gyroZ" />
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_accelerometer') }}</h1>

        <div class="flex justify-between w-full text-primary font-sans">
            <p class="font-bold">X</p>
            <p>{{ test(state.axes.accelX) }}</p>
        </div>
        <div class="flex justify-between w-full text-primary font-sans">
            <p class="font-bold">Y</p>
            <p>{{ test(state.axes.accelY) }}</p>
        </div>
        <div class="flex justify-between w-full text-primary font-sans">
            <p class="font-bold">Z</p>
            <p>{{ test(state.axes.accelZ) }}</p>
        </div>
    </div>
</template>

<style scoped></style>
