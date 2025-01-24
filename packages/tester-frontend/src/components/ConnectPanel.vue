<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import ContentTips from '@/components/common/ContentTips.vue';
import { DualSenseInterface } from 'dualsense.js';
import { formatFirmwareTime } from '@/utils/time.util';
import SelectBox from './common/SelectBox.vue';
import { computed, ref } from 'vue';
import { checkConnectionType } from '@/dualsense/utils';
import { DualSenseConnectionType } from '@/dualsense/types';
import LabeledValue from './common/LabeledValue.vue';
import { decodeShiftJIS, mapDataViewToU8Hex, numberToMacAddress, numberToXHex } from '@/utils/format.util';
import FactorySubPanel from './FactorySubPanel.vue';
import InputInfoSubPanel from './InputInfoSubPanel.vue';
import { DeviceConnectionType } from '@/device-based-router/shared';

const dsStore = useDualSenseStore()

const onConnectBtnClick = () => {
	// dualsenseStore.dualsense.requestDevice()
	dsStore.requestControllerDevice()
}

const deviceList = computed(() => {
	return dsStore.deviceList.map((item, i) => ({
		value: i,
		label: item.deviceName,
		extra: {
			deviceName: item.deviceName,
			connectionType: item.connectionType
		}
	}))
})
</script>

<template>
	<div class="dou-sc-container space-y-2 self-start w-full">
		<ContentTips v-if="!deviceList.length">
			<p v-html="$t('connect_panel.tips')"></p>
		</ContentTips>
		<SelectBox v-if="deviceList.length" :options="deviceList" :model-value="dsStore.currentDeviceIndex"
			@update:model-value="dsStore.setCurrentDeviceIndex">
			<template #default="{ index, extra }">
				<div class="flex text-base items-center py-0.5 gap-1 min-w-0">
					<div class="bg-black/10 dark-bg-white/20 text-black/70 dark-text-white/70 px-1 text-xs rounded font-mono">
						#{{
							index + 1 }}/{{ deviceList.length }}
					</div>
					<div class="flex-1 ml-1 whitespace-nowrap min-w-0 overflow-hidden text-ellipsis" :title="extra!.deviceName">{{
						extra!.deviceName }}</div>
					<div v-if="extra!.connectionType === DeviceConnectionType.Bluetooth" class="i-mingcute-bluetooth-line">
					</div>
					<div v-else class="i-mingcute-usb-line"></div>
				</div>
			</template>
		</SelectBox>
		<!-- <div v-if="dualsenseStore.isConnected">
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
        </div> -->
				<component v-if="dsStore.isDeviceReady" :is="dsStore.views.connectPanel" />
		<!-- <InputInfoSubPanel />
		<FactorySubPanel /> -->

		<div class="flex items-center justify-end">
			<button class="dou-sc-btn" @click="onConnectBtnClick" :disabled="dsStore.updatingDeviceList">
				<div v-if="dsStore.updatingDeviceList" class="i-mingcute-loading-fill animate-spin"></div>
				{{
					$t('connect_panel.add_device')
				}}
			</button>
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
