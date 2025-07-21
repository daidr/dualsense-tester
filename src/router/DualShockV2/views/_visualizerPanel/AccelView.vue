<script setup lang="ts">
import type { ModelProps } from '@/device-based-router/shared'
import { computedAsync } from '@vueuse/core'
import { computed } from 'vue'
import AccelValueBar from '@/components/AccelValueBar.vue'
import ThreeAxisGraph from '@/components/common/ThreeAxisGraph.vue'
import { useConnectionType, useInputReport } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { formatAccel } from '@/utils/format.util'
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
    <AccelValueBar title="X" :value="accelInfo.x" class="text-primary" />
    <AccelValueBar title="Y" :value="accelInfo.y" class="text-[#f14c4c]" />
    <AccelValueBar title="Z" :value="accelInfo.z" class="text-[#f9aa53]" />
    <ThreeAxisGraph v-if="showValue" class="h-150px w-full" :value="accelInfo" />
  </template>
</template>

<style scoped>
.changed-value {
  @apply contain-strict text-lg font-mono;
}
</style>
