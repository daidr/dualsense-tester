<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import ContentTips from '@/components/common/ContentTips.vue';
import { DualSenseInterface } from 'dualsense.js';
import { formatFirmwareTime } from '@/utils/time.util';

const dualsenseStore = useDualSenseStore()

const onConnectBtnClick = () => {
    dualsenseStore.dualsense.requestDevice()
}

const onDisconnectBtnClick = () => {
    dualsenseStore.dualsense.disconnect()
}
</script>

<template>
    <div class="dou-sc-container space-y-2 self-start w-full">
        <ContentTips v-if="!dualsenseStore.isConnected">
            <p v-html="$t('connect_panel.tips')"></p>
        </ContentTips>
        <div v-if="dualsenseStore.isConnected">
            <table>
                <tbody>
                    <tr>
                        <td class="label">{{ $t('connect_panel.report_time') }}</td>
                        <td class="value"><span>{{ dualsenseStore.state.timestamp.toFixed(0) }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="label">{{ $t('connect_panel.battery_level') }}</td>
                        <td class="value"><span>{{ dualsenseStore.state.battery.level }}%</span></td>
                    </tr>
                    <tr>
                        <td class="label">{{ $t('connect_panel.battery_charging_state') }}</td>
                        <td class="value"><span>{{ dualsenseStore.state.battery.charging ?
                            $t('connect_panel.battery_level_charging') :
                            $t('connect_panel.battery_level_not_charging')
                                }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="label">{{ $t('connect_panel.headphone_connect_state') }}</td>
                        <td class="value"><span>{{ dualsenseStore.state.headphoneConnected ?
                            $t('connect_panel.connected') :
                            $t('connect_panel.not_connected') }}</span></td>
                    </tr>
                    <tr>
                        <td class="label">{{ $t('connect_panel.firmware_version') }}</td>
                        <td class="value">
                            <span v-if="dualsenseStore.firmwareVersion?.buildTime" class="text-xs opacity-70">({{
                                formatFirmwareTime(dualsenseStore.firmwareVersion?.buildTime) }}) </span>
                            <span>{{ dualsenseStore.firmwareVersion?.version ??
                                $t('shared.unknown') }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="flex items-center justify-between">
            <button v-if="!dualsenseStore.isConnected" class="dou-sc-btn" @click="onConnectBtnClick">{{
                $t('connect_panel.connect')
            }}</button>
            <button v-else class="dou-sc-btn" @click="onDisconnectBtnClick">{{ $t('connect_panel.disconnect')
                }}</button>
            <div class="flex items-center text-primary/80">
                <div v-if="!dualsenseStore.isConnected">{{ $t('connect_panel.not_connected') }}</div>
                <template v-else>
                    <div v-if="dualsenseStore.state.interface === DualSenseInterface.Bluetooth"
                        class="i-mingcute-bluetooth-line"></div>
                    <div v-else class="i-mingcute-usb-line"></div>
                    <span class="ml-1">{{ $t('connect_panel.connected') }}</span>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
table {
    @apply min-w-full w-0;

    .label {
        @apply text-primary/70 font-bold whitespace-pre-wrap;
    }

    .value {
        @apply opacity-70 text-right;
    }
}
</style>
