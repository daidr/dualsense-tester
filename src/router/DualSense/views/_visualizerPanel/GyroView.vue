<script setup lang="ts">
import { useConnectionType, useInputReport } from '@/composables/useInjectValues';
import { DeviceConnectionType, type ModelProps } from '@/device-based-router/shared';
import { computed } from 'vue';
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util';
import { computedAsync } from '@vueuse/core';
import GyroValueBar from '@/components/GyroValueBar.vue';
import ThreeAxisGraph from '@/components/common/ThreeAxisGraph.vue';

defineProps<ModelProps>()

const inputReport = useInputReport()
const connectionType = useConnectionType()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth
)

const gyroInfo = computedAsync(async () => {
  const gyroPitch = inputReport.value.getInt16(offset.value.gyroPitch, true)
  const gyroYaw = inputReport.value.getInt16(offset.value.gyroYaw, true)
  const gyroRoll = inputReport.value.getInt16(offset.value.gyroRoll, true)

  return {
    x: gyroPitch,
    y: gyroYaw,
    z: gyroRoll
  }
})

</script>

<template>
  <template v-if="gyroInfo">
    <div>
      <GyroValueBar :title="$t('info_panel.pitch')" :value="gyroInfo.x" />
      <GyroValueBar class="text-[#f14c4c]!" :title="$t('info_panel.yaw')" :value="gyroInfo.y" />
      <GyroValueBar class="text-[#f9aa53]!" :title="$t('info_panel.roll')" :value="gyroInfo.z" />
    </div>
    <ThreeAxisGraph v-if="showValue" class="w-full h-150px" :value="gyroInfo" />
  </template>
</template>

<style scoped></style>
