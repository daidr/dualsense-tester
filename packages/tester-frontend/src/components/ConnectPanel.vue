<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import ContentTips from '@/components/common/ContentTips.vue';

const dualsenseStore = useDualSenseStore()

const onConnectBtnClick = () => {
    dualsenseStore.dualsense.requestDevice()
}
</script>

<template>
    <div class="dou-sc-container space-y-2 self-start w-full">
        <ContentTips>
            <p v-html="$t('connect_panel.tips')"></p>
        </ContentTips>
        <div v-if="dualsenseStore.isConnected">
            <table>
                <tr>
                    <td class="label">{{ $t('connect_panel.report_time') }}</td>
                    <td class="value">{{ dualsenseStore.state.timestamp.toFixed(2) }}</td>
                </tr>
                <tr>
                    <td class="label">{{ $t('connect_panel.battery_level') }}</td>
                    <td class="value">{{ dualsenseStore.state.battery.level }}%</td>
                </tr>
                <tr>
                    <td class="label">{{ $t('connect_panel.battery_charging_state') }}</td>
                    <td class="value">{{ dualsenseStore.state.battery.charging ? $t('connect_panel.battery_level_charging') : $t('connect_panel.battery_level_not_charging') }}</td>
                </tr>
                <tr>
                    <td class="label">{{ $t('connect_panel.headphone_connect_state') }}</td>
                    <td class="value">{{ dualsenseStore.state.headphoneConnected ? $t('connect_panel.connected') : $t('connect_panel.not_connected') }}</td>
                </tr>
            </table>
        </div>
        <div class="flex items-center justify-between">
            <button class="dou-sc-btn" @click="onConnectBtnClick">{{
                $t('connect_panel.connect')
            }}</button>
            <div class="flex items-center text-primary/80">
                <div v-if="!dualsenseStore.isConnected">{{ $t('connect_panel.not_connected') }}</div>
                <template v-else>
                    <div v-if="dualsenseStore.state.interface === 'bt'" class="i-mingcute-bluetooth-line"></div>
                    <div v-else class="i-mingcute-usb-line"></div>
                    <span class="ml-1">{{ $t('connect_panel.connected') }}</span>
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
