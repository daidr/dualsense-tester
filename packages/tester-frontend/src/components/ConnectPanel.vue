<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import ContentTips from '@/components/common/ContentTips.vue';

const dualsenseStore = useDualSenseStore()

const onConnectBtnClick = () => {
    dualsenseStore.dualsense.requestDevice()
}
</script>

<template>
    <div class="dou-sc-container space-y-2 self-start">
        <ContentTips>
            <p>Connect the DualSense to your computer using either a <b>USB cable</b> or <b>Bluetooth</b>, then click the
                “Connect” button below.</p>
        </ContentTips>
        <div v-if="dualsenseStore.isConnected">
            <table>
                <tr>
                    <td class="label">Report Time</td>
                    <td class="value">{{ dualsenseStore.state.timestamp.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td class="label">Battery</td>
                    <td class="value">{{ dualsenseStore.state.battery.level }}%</td>
                </tr>
                <tr>
                    <td class="label">Charging</td>
                    <td class="value">{{ dualsenseStore.state.battery.charging }}</td>
                </tr>
            </table>
        </div>
        <div class="flex items-center justify-between">
            <button class="dou-sc-btn" @click="onConnectBtnClick">{{
                'Connect'
            }}</button>
            <div class="flex items-center text-primary/80">
                <div v-if="!dualsenseStore.isConnected">Not Connected</div>
                <template v-else>
                    <div v-if="dualsenseStore.state.interface === 'bt'" class="i-mingcute-bluetooth-line"></div>
                    <div v-else class="i-mingcute-usb-line"></div>
                    <span class="ml-1">Connected</span>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
table {
    @apply w-full;

    .label {
        @apply text-primary/70 font-bold;
    }

    .value {
        @apply opacity-70 text-right;
    }
}
</style>
