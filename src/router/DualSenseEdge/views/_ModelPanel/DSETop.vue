<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionType, useInputReport } from '@/composables/useInjectValues'

import { DeviceConnectionType } from '@/device-based-router/shared'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util'

const inputReport = useInputReport()
const connectionType = useConnectionType()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth,
)

const isStickModuleLost = computed(() => {
  return (inputReport.value.getUint8(offset.value.triggerLevel) & 15) !== 0
})
</script>

<template>
  <div
    v-if="isStickModuleLost"
    class="absolute left-1/2 top-6% inline-block flex transform items-center gap-2 rounded-2xl bg-red-7/20 px-2 py-1 text-red-7 ring-2 ring-current -translate-x-1/2"
  >
    <div class="i-mingcute-warning-line" />
    {{ $t('info_panel.stick_module_not_found') }}
  </div>
</template>

<style scoped></style>
