<script setup lang="ts">
import type { PlayerLedBrightness } from '@/utils/dualsense/ds.type'
import ColorInput from '@/components/common/ColorInput.vue'
import GroupedButton from '@/components/common/GroupedButton.vue'
import SelfResettingSlider from '@/components/common/SelfResettingSlider.vue'
import SliderBox from '@/components/common/SliderBox.vue'
import { useDevice } from '@/composables/useInjectValues'
import { hexToRgb, rgbToHex } from '@/utils/color.util'
import { MuteButtonLedControl, PlayerLedControl } from '@/utils/dualsense/ds.type'
import { receiveFeatureReport, sendFeatureReport, sendOutputReportFactory } from '@/utils/dualshock/ds4.util'
import { bitShiftByte } from '@/utils/format.util'
import { createAsyncLock } from '@/utils/lock.util'
import { computed, onMounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventBusRegister } from '../_utils/eventbus.util'
import { OutputStruct } from './_OutputPanel/outputStruct'

const { t } = useI18n()
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
          1
        </td>
        <td class="value">
          <div>
            2
          </div>
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
