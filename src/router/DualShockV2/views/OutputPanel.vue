<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDevice } from '@/composables/useInjectValues'
import { sendOutputReportFactory } from '@/utils/dualshock/ds4.util'
import { createAsyncLock } from '@/utils/lock.util'
import { OutputStruct } from './_OutputPanel/outputStruct'

const device = useDevice()

const struct = new OutputStruct()

const _sendOutputReport = computed(() => {
  return sendOutputReportFactory(device.value)
})

const outputReportLock = createAsyncLock()
async function sendOutputReport(before?: () => void, after?: () => void) {
  await outputReportLock(async () => {
    before?.()
    const outputReport = struct.reportData
    await _sendOutputReport.value(outputReport)
    after?.()
  })
  // cancelAnimationFrame(rafId)
  // rafId = requestAnimationFrame(async () => {
  //   before?.()
  //   const outputReport = struct.reportData
  //   await _sendOutputReport.value(outputReport)
  //   after?.()
  // })
}

onMounted(() => {
  // In Bluetooth mode, DualShock defaults to returning a simplified input report (0x01), and only returns the complete input report (0x17) after requesting feature report 0x02
  // Not certain if third-party controllers also have this issue
  // receiveFeatureReport(device.value, 0x02)
  sendOutputReport(() => {
  }, () => {
  })
})
</script>

<template>
  <table>
    <tbody>
      <tr>
        <td class="label">
          Working in progress...
        </td>
        <td class="value">
          <div />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
table {
  @apply w-full;
}

.label,
:deep(.label) {
  @apply text-primary font-bold whitespace-pre-wrap;
}

.value,
:deep(.value) {
  @apply max-w-50% ps-2;

  &>div {
    @apply flex items-center justify-end;
  }
}
</style>
