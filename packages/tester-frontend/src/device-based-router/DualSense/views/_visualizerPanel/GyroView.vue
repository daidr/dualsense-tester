<script setup lang="ts">

import { useConnectionType, useInputReport } from '@/composables/useInjectValues';
import { DeviceConnectionType } from '@/device-based-router/shared';
import { computed } from 'vue';
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../utils/offset.util';
import { computedAsync } from '@vueuse/core';
import AccelValueBar from '@/components/GryoValueBar.vue';

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
    gyroPitch,
    gyroYaw,
    gyroRoll,
  }
})

</script>

<template>
  <template v-if="gyroInfo">
    <AccelValueBar :title="$t('info_panel.pitch')" :value="gyroInfo.gyroPitch" />
    <AccelValueBar :title="$t('info_panel.yaw')" :value="gyroInfo.gyroYaw" />
    <AccelValueBar :title="$t('info_panel.roll')" :value="gyroInfo.gyroRoll" />
  </template>
</template>

<style scoped></style>
