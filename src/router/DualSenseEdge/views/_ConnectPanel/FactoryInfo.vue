<script setup lang="ts">
import LocaleLabeledValue from '@/components/common/LocaleLabeledValue.vue'
import { useConnectionType, useDevice } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { utf8Decoder } from '@/utils/decoder.util'
import { formatDspVersion, formatThreePartVersion, formatUpdateVersion, getAssemblePartsInfo, getBatteryBarcode, getBdMacAddress, getBtPatchInfo, getIndividualDataVerifyStatus, getPcbaId, getPcbaIdFull, getPcbaIdFullString, getSerialNumber, getUniqueId, getVcmBarcode, type2TracabilityInfoRead } from '@/utils/dualsense/ds.util'
import { decodeShiftJIS, mapDataViewToU8Hex, notAllFalsy, numberToMacAddress, numberToXHex, pairedValue } from '@/utils/format.util'
import { createLabeledValueItem, type LabeledValueItem } from '@/utils/labeled-value.util'
import { hidLogger } from '@/utils/logger.util'
import { computedAsync } from '@vueuse/core'
import { ref } from 'vue'

const showFactoryInfo = ref(false)
const deviceItem = useDevice()
const connectionType = useConnectionType()

async function getFirmwareInfo(device: HIDDevice) {
  const data = await device.receiveFeatureReport(0x20)
  hidLogger.debug('firmware data', data.buffer)

  const buildDate = utf8Decoder.decode(new DataView(data.buffer, 1, 11))
  const buildTime = utf8Decoder.decode(new DataView(data.buffer, 12, 8))
  return {
    buildDate,
    buildTime,
    fwType: data.getUint16(20, true),
    swSeries: data.getUint16(22, true),
    hwInfo: data.getUint32(24, true),
    mainFwVersion: data.getUint32(28, true),
    deviceInfo: new DataView(data.buffer, 32, 12),
    updateVersion: data.getUint16(44, true),
    updateImageInfo: new DataView(data.buffer, 46, 1),
    sblFwVersion: data.getUint32(48, true),
    dspFwVersion: data.getUint32(52, true),
    spiderDspFwVersion: data.getUint32(56, true),
  }
}

const hardwareInfo = computedAsync(async () => {
  const result: LabeledValueItem[] = []
  const device = deviceItem.value.device
  const firmwareInfo = await getFirmwareInfo(device)

  result.push(createLabeledValueItem('build_time', `${firmwareInfo.buildDate} ${firmwareInfo.buildTime}`))
  result.push(createLabeledValueItem('hw_info', numberToXHex(firmwareInfo.hwInfo, 8)))
  result.push(createLabeledValueItem('device_info', `0x${mapDataViewToU8Hex(firmwareInfo.deviceInfo, true)}`))
  result.push(createLabeledValueItem('fw_type', numberToXHex(firmwareInfo.fwType, 4)))
  result.push(createLabeledValueItem('sw_series', numberToXHex(firmwareInfo.swSeries, 4)))
  result.push(createLabeledValueItem('update_version', formatUpdateVersion(firmwareInfo.updateVersion)))
  result.push(createLabeledValueItem('sbl_fw_version', formatThreePartVersion(firmwareInfo.sblFwVersion)))
  result.push(createLabeledValueItem('main_fw_version', formatThreePartVersion(firmwareInfo.mainFwVersion)))
  result.push(createLabeledValueItem('dsp_fw_version', formatDspVersion(firmwareInfo.dspFwVersion)))
  result.push(createLabeledValueItem('mcu_dsp_fw_version', formatThreePartVersion(firmwareInfo.spiderDspFwVersion)))

  const doesEnableNewTracabilityInfo = true
  const hasAdditionalAtTracabilityInfo = true
  if ([2, 3].includes(firmwareInfo.fwType)) {
    if (doesEnableNewTracabilityInfo) {
      const btPatchInfo = await getBtPatchInfo(deviceItem.value)
      btPatchInfo && result.push(createLabeledValueItem('bt_patch_version', numberToXHex(btPatchInfo, 8)))
      const pcbaIdFull = await getPcbaIdFull(deviceItem.value)
      pcbaIdFull && result.push(createLabeledValueItem('pcba_id', getPcbaIdFullString(pcbaIdFull, firmwareInfo.hwInfo)))
      const serialNumber = await getSerialNumber(deviceItem.value)
      serialNumber && result.push(createLabeledValueItem('serial_number', decodeShiftJIS(serialNumber)))
      const assemblePartsInfo = await getAssemblePartsInfo(deviceItem.value)
      assemblePartsInfo && result.push(createLabeledValueItem('assemble_parts_info', `0x${mapDataViewToU8Hex(assemblePartsInfo, true)}`))
      const batteryBarcode = await getBatteryBarcode(deviceItem.value)
      batteryBarcode && result.push(createLabeledValueItem('battery_barcode', decodeShiftJIS(batteryBarcode)))
      const { left, right } = await getVcmBarcode(deviceItem.value)
      notAllFalsy(left, right) && result.push(createLabeledValueItem('vcm_barcode', pairedValue(decodeShiftJIS(left), decodeShiftJIS(right))))
    }
    else {
      const pcbaId = await getPcbaId(deviceItem.value)
      pcbaId && result.push(createLabeledValueItem('pcba_id', numberToXHex(pcbaId, 12)))
    }
    const uniqueId = await getUniqueId(deviceItem.value)
    uniqueId && result.push(createLabeledValueItem('unique_id', numberToXHex(uniqueId, 16)))
    const bdMacAddress = await getBdMacAddress(deviceItem.value)
    bdMacAddress && result.push(createLabeledValueItem('bd_mac_address', numberToMacAddress(bdMacAddress)))

    if (hasAdditionalAtTracabilityInfo) {
      const leftTracabilityInfo = await type2TracabilityInfoRead(deviceItem.value, 'left')
      const rightTracabilityInfo = await type2TracabilityInfoRead(deviceItem.value, 'right')

      notAllFalsy(leftTracabilityInfo, rightTracabilityInfo) && result.push(createLabeledValueItem('at_serial_number', pairedValue(leftTracabilityInfo?.serialNo, rightTracabilityInfo?.serialNo)))
      notAllFalsy(leftTracabilityInfo, rightTracabilityInfo) && result.push(createLabeledValueItem('at_motor_info', pairedValue(leftTracabilityInfo?.motorInfo, rightTracabilityInfo?.motorInfo)))
    }

    // if (connectionType.value === DeviceConnectionType.USB) {
    //   const individualDataVerifyStatus = await getIndividualDataVerifyStatus(deviceItem.value)
    //   result.push(createLabeledValueItem('individual_data_verify', individualDataVerifyStatus, 'connect_panel.factory_info.individual_data'))
    // }
    // else {
    //   result.push(createLabeledValueItem('individual_data_verify', 'not_supported', 'connect_panel.factory_info.individual_data'))
    // }
  }
  return result
})
</script>

<template>
  <template v-if="hardwareInfo">
    <div class="factory-toggle" @click="showFactoryInfo = !showFactoryInfo">
      <div class="line" />
      {{ showFactoryInfo ? $t('connect_panel.hide_factory_info') : $t('connect_panel.show_factory_info') }}
      <div class="line" />
      <div
        class="i-mingcute-down-fill transform-gpu text-lg transition-transform" :class="{
          'rotate-180': showFactoryInfo,
        }"
      />
    </div>
    <div v-if="showFactoryInfo" class="factory-items rounded-2xl p-1 text-primary dou-sc-colorborder">
      <div class="flex flex-col">
        <LocaleLabeledValue
          v-for="item of hardwareInfo" :key="item.label"
          :label="`connect_panel.factory_info.${item.label}`" :value="item.value"
          :value-locale-prefix="item.valueLocalePrefix"
        />
      </div>
    </div>
  </template>
</template>

<style scoped lang="scss">
.factory-items {
  :deep(span) {
    @apply font-mono;
  }
}

.factory-toggle {
  --color: theme('colors.primary/0.8');

  &:hover {
    --color: theme('colors.primary');
  }

  @apply w-full flex items-center justify-center gap-2 px-1 rounded-xl;
  @apply text-[var(--color)] cursor-pointer text-sm font-bold;
  @apply transition-colors select-none;

  .line {
    @apply content-empty flex-grow;
    @apply h-2px bg-[var(--color)] rounded-full;
    @apply transition-colors;
  }

  @apply bg-transparent hover-bg-primary/10;
}
</style>
