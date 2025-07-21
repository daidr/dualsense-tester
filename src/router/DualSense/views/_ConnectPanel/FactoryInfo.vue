<script setup lang="tsx">
import type { LabeledValueItem } from '@/utils/labeled-value.util'
import { computedAsync } from '@vueuse/core'
import { I18nT, useI18n } from 'vue-i18n'
import LocaleLabeledValue from '@/components/common/LocaleLabeledValue.vue'
import { useDevice } from '@/composables/useInjectValues'
import { utf8Decoder } from '@/utils/decoder.util'
import { DualSenseColorMap } from '@/utils/dualsense/ds.type'
import { formatDspVersion, formatThreePartVersion, formatUpdateVersion, getAssemblePartsInfo, getBatteryBarcode, getBdMacAddress, getBtPatchInfo, getIndividualDataVerifyStatus, getPcbaId, getPcbaIdFull, getPcbaIdFullString, getSerialNumber, getUniqueId, getVcmBarcode, type2TracabilityInfoRead } from '@/utils/dualsense/ds.util'
import { decodeShiftJIS, mapDataViewToU8Hex, notAllFalsy, numberToMacAddress, numberToXHex, pairedValue } from '@/utils/format.util'
import { createLabeledValueItem } from '@/utils/labeled-value.util'
import { hidLogger } from '@/utils/logger.util'

const deviceItem = useDevice()
const { t } = useI18n()

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

  const doesEnableNewTracabilityInfo = (firmwareInfo.hwInfo & 0xFFFF) >= 777
    && firmwareInfo.mainFwVersion >= 65655
  const hasAdditionalAtTracabilityInfo = (firmwareInfo.hwInfo & 0xFFFF) >= 777
  if ([2, 3].includes(firmwareInfo.fwType)) {
    if (doesEnableNewTracabilityInfo) {
      const btPatchInfo = await getBtPatchInfo(deviceItem.value)
      btPatchInfo && result.push(createLabeledValueItem('bt_patch_version', numberToXHex(btPatchInfo, 8)))
      const pcbaIdFull = await getPcbaIdFull(deviceItem.value)
      pcbaIdFull && result.push(createLabeledValueItem('pcba_id', getPcbaIdFullString(pcbaIdFull, firmwareInfo.hwInfo)))
      const serialNumber = await getSerialNumber(deviceItem.value)
      serialNumber && result.push(createLabeledValueItem('serial_number', decodeShiftJIS(serialNumber)))
      if (serialNumber) {
        const serialNumberStr = decodeShiftJIS(serialNumber)
        const color = DualSenseColorMap[serialNumberStr.slice(4, 6)]
        const tooltip = (
          <div>
            <I18nT keypath="connect_panel.factory_info.colors.tips" tag="p" scope="global">
              {{
                tips_link: () => (
                  <a
                    href="https://github.com/daidr/dualsense-tester/issues/new?template=01-incorrect-controller-color-detection.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="dou-sc-link"
                  >
                    {t('connect_panel.factory_info.colors.tips_link')}
                  </a>
                ),
              }}
            </I18nT>
          </div>
        )
        if (color) {
          result.push(createLabeledValueItem('color', color, `connect_panel.factory_info.colors`, tooltip))
        }
        else {
          result.push(createLabeledValueItem('color', '', 'shared.unknown', tooltip))
        }
      }
      if (serialNumber) {
        // https://www.ifixit.com/Wiki/How_to_Identify_PS5_DualSense_Controller_Version
        const serialNumberStr = decodeShiftJIS(serialNumber)
        const boardVersionNumber = serialNumberStr.slice(1, 2)
        if (['1', '2', '3', '4', '5'].includes(boardVersionNumber)) {
          result.push(createLabeledValueItem('board_version', `BDM-0${boardVersionNumber}0`))
        }
        else {
          result.push(createLabeledValueItem('board_version', 'unknown', 'shared'))
        }
      }
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
  <div v-if="hardwareInfo" class="flex flex-col">
    <LocaleLabeledValue
      v-for="item of hardwareInfo" :key="item.label"
      :label="`connect_panel.factory_info.${item.label}`" :value="item.value"
      :value-locale-prefix="item.valueLocalePrefix" :tooltip="item.tooltip"
    />
  </div>
</template>

<style scoped lang="scss">
:deep(span) {
  @apply font-mono;
}
</style>
