<script setup lang="ts">
import type { LabeledValueItem } from '@/utils/labeled-value.util'
import { computedAsync } from '@vueuse/core'
import { trim } from 'lodash-es'
import LocaleLabeledValue from '@/components/common/LocaleLabeledValue.vue'
import { useDevice } from '@/composables/useInjectValues'
import { utf8Decoder } from '@/utils/decoder.util'
import { formatDspVersion, formatThreePartVersion, formatUpdateVersion, getAssemblePartsInfo, getBatteryBarcode, getBdMacAddress, getBtPatchInfo, getIndividualDataVerifyStatus, getPcbaId, getPcbaIdFull, getPcbaIdFullString, getSerialNumber, getUniqueId, getVcmBarcode, type2TracabilityInfoRead } from '@/utils/dualsense/ds.util'
import { decodeShiftJIS, mapDataViewToU8Hex, notAllFalsy, numberToMacAddress, numberToXHex, pairedValue } from '@/utils/format.util'
import { createLabeledValueItem } from '@/utils/labeled-value.util'
import { hidLogger } from '@/utils/logger.util'

const deviceItem = useDevice()

async function getFirmwareInfo(device: HIDDevice) {
  const data = await device.receiveFeatureReport(0xA3)
  hidLogger.debug('firmware data', data.buffer)

  const cmd = data.getInt8(0)
  if (cmd !== 0xA3 || data.buffer.byteLength < 49) {
    if (data.byteLength !== 49) {
      return {
        fake: true,
      }
    }
  }

  // oxlint-disable-next-line no-control-regex
  const buildDate = utf8Decoder.decode(new DataView(data.buffer, 1, 16)).replace(/\0/g, '')
  // oxlint-disable-next-line no-control-regex
  const buildTime = utf8Decoder.decode(new DataView(data.buffer, 17, 8)).replace(/\0/g, '')

  return {
    buildDate,
    buildTime,
    fake: false,
    // fwType: data.getUint16(20, true),
    // swSeries: data.getUint16(22, true),
    // hwInfo: data.getUint32(24, true),
    // mainFwVersion: data.getUint32(28, true),
    // deviceInfo: new DataView(data.buffer, 32, 12),
    // updateVersion: data.getUint16(44, true),
    // updateImageInfo: new DataView(data.buffer, 46, 1),
    // sblFwVersion: data.getUint32(48, true),
    // dspFwVersion: data.getUint32(52, true),
    // spiderDspFwVersion: data.getUint32(56, true),
  }
}

const hardwareInfo = computedAsync(async () => {
  const result: LabeledValueItem[] = []
  const device = deviceItem.value.device
  const firmwareInfo = await getFirmwareInfo(device)

  if (firmwareInfo.fake) {
    result.push(createLabeledValueItem('status', '', 'connect_panel.factory_info.status_fake'))
    return result
  }

  result.push(createLabeledValueItem('build_time', `${firmwareInfo.buildDate} ${firmwareInfo.buildTime}`))
  // result.push(createLabeledValueItem('hw_info', numberToXHex(firmwareInfo.hwInfo, 8)))
  // result.push(createLabeledValueItem('device_info', `0x${mapDataViewToU8Hex(firmwareInfo.deviceInfo, true)}`))
  // result.push(createLabeledValueItem('fw_type', numberToXHex(firmwareInfo.fwType, 4)))
  // result.push(createLabeledValueItem('sw_series', numberToXHex(firmwareInfo.swSeries, 4)))
  // result.push(createLabeledValueItem('update_version', formatUpdateVersion(firmwareInfo.updateVersion)))
  // result.push(createLabeledValueItem('sbl_fw_version', formatThreePartVersion(firmwareInfo.sblFwVersion)))
  // result.push(createLabeledValueItem('main_fw_version', formatThreePartVersion(firmwareInfo.mainFwVersion)))
  // result.push(createLabeledValueItem('dsp_fw_version', formatDspVersion(firmwareInfo.dspFwVersion)))
  // result.push(createLabeledValueItem('mcu_dsp_fw_version', formatThreePartVersion(firmwareInfo.spiderDspFwVersion)))

  return result
})
</script>

<template>
  <div v-if="hardwareInfo" class="flex flex-col">
    <LocaleLabeledValue
      v-for="item of hardwareInfo" :key="item.label"
      :label="`connect_panel.factory_info.${item.label}`" :value="item.value"
      :value-locale-prefix="item.valueLocalePrefix"
    />
  </div>
</template>

<style scoped lang="scss">
:deep(span) {
  @apply font-mono;
}
</style>
