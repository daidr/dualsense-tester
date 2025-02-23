<script setup lang="ts">
import ThreeAxisGraph from '@/components/common/ThreeAxisGraph.vue'
import { useConnectionType, useInputReport } from '@/composables/useInjectValues'
import { DeviceConnectionType, type ModelProps } from '@/device-based-router/shared'
import { formatAccel } from '@/utils/format.util'
import { computedAsync } from '@vueuse/core'
import { computed } from 'vue'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util'

defineProps<ModelProps>()

const inputReport = useInputReport()
const connectionType = useConnectionType()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth,
)

const accelInfo = computedAsync(async () => {
  const accelX = inputReport.value.getInt16(offset.value.accelX, true)
  const accelY = inputReport.value.getInt16(offset.value.accelY, true)
  const accelZ = inputReport.value.getInt16(offset.value.accelZ, true)

  return {
    x: accelX,
    y: accelY,
    z: accelZ,
  }
})
</script>

<template>
  <template v-if="accelInfo">
    <div class="w-full flex justify-between text-primary font-sans">
      <p class="font-bold">
        X
      </p>
      <p class="w-1/2 text-end">
        <span class="font-mono">{{ formatAccel(accelInfo.x) }}</span> m/s²
      </p>
    </div>
    <div class="w-full flex justify-between text-[#f14c4c] font-sans">
      <p class="font-bold">
        Y
      </p>
      <p class="w-1/2 text-end">
        <span class="font-mono">{{ formatAccel(accelInfo.y) }}</span> m/s²
      </p>
    </div>
    <div class="w-full flex justify-between text-[#f9aa53] font-sans">
      <p class="font-bold">
        Z
      </p>
      <p class="w-1/2 text-end">
        <span class="font-mono">{{ formatAccel(accelInfo.z) }}</span> m/s²
      </p>
    </div>
    <ThreeAxisGraph v-if="showValue" class="h-150px w-full" :value="accelInfo" />
  </template>
</template>

<style scoped></style>
