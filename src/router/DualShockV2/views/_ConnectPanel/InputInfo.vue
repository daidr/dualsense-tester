<script setup lang="ts">
import { computed } from 'vue'
import LocaleLabeledValue from '@/components/common/LocaleLabeledValue.vue'
import { useConnectionType, useInputReport } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util'

const inputReport = useInputReport()
const connectionType = useConnectionType()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth,
)

function chargeStatusToString(chargeType: number) {
  if (chargeType <= 10) {
    return 'charging'
  }
  else if (chargeType === 11) {
    return 'charging_complete'
  }
  else {
    return 'charging_error'
  }
}

function batteryLevelToString(batteryLevel: number) {
  switch (batteryLevel) {
    case 0:
      return 'level0'
    case 1:
      return 'level1'
    case 2:
      return 'level2'
    case 3:
      return 'level3'
    case 4:
      return 'level4'
    case 5:
      return 'level5'
    case 6:
      return 'level6'
    case 7:
      return 'level7'
    case 8:
      return 'level8'
    case 9:
      return 'level9'
    case 10:
      return 'level10'
    default:
      return 'unknown'
  }
}

const status0 = computed(() => {
  return inputReport.value.getInt8(offset.value.status)
})

const detectMic = computed(() => {
  return status0.value & 0x20 ? 'connected' : 'not_connected'
})

const detectHeadphone = computed(() => {
  return status0.value & 0x40 ? 'connected' : 'not_connected'
})

const chargeStatus = computed(() => {
  if ((status0.value & 0x10) === 0) {
    return 'discharging'
  }
  const num2 = status0.value & 0x0F

  return chargeStatusToString(num2)
})

const batteryLevel = computed(() => {
  let num2 = status0.value & 0x0F
  if (num2 === 10 || num2 === 11) {
    num2 = 10
  }

  return batteryLevelToString(num2)
})

const seqNum = computed(() => inputReport.value.getUint8(offset.value.sequenceNum))
</script>

<template>
  <div class="flex flex-col">
    <LocaleLabeledValue :value="seqNum.toString()" label="connect_panel.seq_num" />
    <LocaleLabeledValue
      :value="chargeStatus" value-locale-prefix="connect_panel.charge_status"
      label="connect_panel.charge_status_label"
    />
    <LocaleLabeledValue
      :value="batteryLevel" value-locale-prefix="connect_panel.battery_level"
      label="connect_panel.battery_level_label"
    />
    <LocaleLabeledValue
      :value="detectMic" value-locale-prefix="connect_panel"
      label="connect_panel.microphone_status_label"
    />
    <LocaleLabeledValue
      :value="detectHeadphone" value-locale-prefix="connect_panel"
      label="connect_panel.headphone_status_label"
    />
  </div>
</template>

<style scoped lang="scss"></style>
