<script setup lang="ts">

import { useConnectionType, useInputReport } from '@/composables/useInjectValues';
import { DeviceConnectionType, type ModelProps } from '@/device-based-router/shared';
import { computed } from 'vue';
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util';
import { computedAsync } from '@vueuse/core';
import ThreeAxisGraph from '@/components/common/ThreeAxisGraph.vue';

defineProps<ModelProps>()

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
    x: accelX,
    y: accelY,
    z: accelZ
  }
})

</script>

<template>
  <template v-if="accelInfo">
    <div class="flex justify-between w-full text-primary font-sans">
      <p class="font-bold">X</p>
      <p class="w-1/2 text-right">{{ accelInfo.x }}</p>
    </div>
    <div class="flex justify-between w-full text-[#f14c4c] font-sans">
      <p class="font-bold">Y</p>
      <p class="w-1/2 text-right">{{ accelInfo.y }}</p>
    </div>
    <div class="flex justify-between w-full text-[#f9aa53] font-sans">
      <p class="font-bold">Z</p>
      <p class="w-1/2 text-right">{{ accelInfo.z }}</p>
    </div>
    <ThreeAxisGraph v-if="showValue" class="w-full h-150px" :value="accelInfo" />
  </template>
</template>

<style scoped></style>
