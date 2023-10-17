<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import DualSenseModel from './DualSenseModel.vue';
import AccelValueBar from './AccelValueBar.vue';
import { storeToRefs } from 'pinia';
import ContentTips from './common/ContentTips.vue';
const dualsenseStore = useDualSenseStore();
const {state} = storeToRefs(dualsenseStore)
</script>

<template>
    <div v-if="!dualsenseStore.isConnected"
        class="h-full flex items-center justify-center text-lg text-primary/70 select-none">
        {{ $t('info_panel.tips') }}
    </div>
    <div v-else class="flex flex-col items-center max-w-500px mx-auto">
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_buttons') }}</h1>
        <DualSenseModel />
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_accelerometer') }}</h1>
        <AccelValueBar :title="$t('info_panel.pitch')" :value="state.axes.accelPitch" />
        <AccelValueBar :title="$t('info_panel.yaw')" :value="state.axes.accelYaw" />
        <AccelValueBar :title="$t('info_panel.roll')" :value="state.axes.accelRoll" />
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_gyroscope') }}</h1>
        <ContentTips class="w-full"  icon="i-icon-park-twotone-code-laptop" :title="$t('info_panel.gyroscope_in_progress')">
            {{ $t('info_panel.gyroscope_tips') }}
        </ContentTips>
    </div>
</template>

<style scoped></style>
