<script setup lang="ts">

import { useConnectionType, useInputReport } from '@/composables/useInjectValues';
import { DeviceConnectionType } from '@/device-based-router/shared';
import { computed } from 'vue';
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../utils/offset.util';
import { computedAsync } from '@vueuse/core';

const inputReport = useInputReport()
const connectionType = useConnectionType()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth
)

const accelInfo = computedAsync(async () => {
  const accelX = inputReport.value.getInt16(offset.value.accelX, true)
  const accelY = inputReport.value.getInt16(offset.value.accelY, true)
  const accelZ = inputReport.value.getInt16(offset.value.accelZ, true)

  return {
    accelX,
    accelY,
    accelZ
  }
})

</script>

<template>
  <template v-if="accelInfo">
    <div class="flex justify-between w-full text-primary font-sans">
      <p class="font-bold">X</p>
      <p class="w-1/2 text-right">{{ accelInfo.accelX }}</p>
    </div>
    <div class="flex justify-between w-full text-primary font-sans">
      <p class="font-bold">Y</p>
      <p class="w-1/2 text-right">{{ accelInfo.accelY }}</p>
    </div>
    <div class="flex justify-between w-full text-primary font-sans">
      <p class="font-bold">Z</p>
      <p class="w-1/2 text-right">{{ accelInfo.accelZ }}</p>
    </div>
  </template>
</template>

<style scoped></style>
