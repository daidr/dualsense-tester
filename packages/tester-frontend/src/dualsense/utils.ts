import { shiftJISDecoder, utf8Decoder } from '@/utils/decoder.util'
import { decodeShiftJIS, mapDataViewToU8Hex, notAllFalsy, numberToHex, numberToMacAddress, numberToXHex, pairedValue } from '@/utils/format.util'
import { PRODUCT_ID_DUALSENSE, PRODUCT_ID_DUALSENSE_EDGE, USAGE_ID_GD_GAME_PAD, USAGE_PAGE_GENERIC_DESKTOP, VENDOR_ID_SONY } from './constants'
import { crc32, DPadDirection, fillFeatureReportChecksum } from './crc32'
import { type DeviceItem, DualSenseConnectionType, type DualSenseDeviceInfo, type DualSenseFirmwareInfo, type DualSenseInitialFirmwareInfo, DualSenseTestActionId, DualSenseTestDeviceId, DualSenseType, type DualSenseVisualResult, type InputReportOffset, type LabeledValueItem, TestResult, TestStatus } from './types'

export function isDualSenseEdge(device: HIDDevice) {
  return (
    device.vendorId === VENDOR_ID_SONY
    && device.productId === PRODUCT_ID_DUALSENSE_EDGE
  )
}

export function isNormalDualSense(device: HIDDevice) {
  return (
    device.vendorId === VENDOR_ID_SONY
    && device.productId === PRODUCT_ID_DUALSENSE
  )
}

export function getDualSenseType(device: HIDDevice) {
  if (isDualSenseEdge(device)) {
    return DualSenseType.DualSenseEdge
  }
  if (isNormalDualSense(device)) {
    return DualSenseType.DualSense
  }
  return DualSenseType.Unknown
}

export async function requestControllerDevice() {
  try {
    await navigator.hid.requestDevice({
      filters: [
        // DualSense
        {
          vendorId: VENDOR_ID_SONY,
          productId: PRODUCT_ID_DUALSENSE,
          usagePage: USAGE_PAGE_GENERIC_DESKTOP,
          usage: USAGE_ID_GD_GAME_PAD,
        },
        // DualSense Edge
        {
          vendorId: VENDOR_ID_SONY,
          productId: PRODUCT_ID_DUALSENSE_EDGE,
          usagePage: USAGE_PAGE_GENERIC_DESKTOP,
          usage: USAGE_ID_GD_GAME_PAD,
        },
      ],
    })
  }
  catch (error) {
    console.error(error)
    return false
  }
  return true
}

export function checkConnectionType(device: HIDDevice) {
  for (const c of device.collections) {
    if (c.usagePage !== USAGE_PAGE_GENERIC_DESKTOP || c.usage !== USAGE_ID_GD_GAME_PAD) {
      continue
    }

    // Compute the maximum input report byte length and compare against known values.
    const maxInputReportBytes = c.inputReports!.reduce((max, report) => {
      return Math.max(
        max,
        report.items!.reduce((sum, item) => {
          return sum + item.reportSize! * item.reportCount!
        }, 0),
      )
    }, 0)
    if (maxInputReportBytes === 504) {
      return DualSenseConnectionType.USB
    }
    else if (maxInputReportBytes === 616) {
      return DualSenseConnectionType.Bluetooth
    }
  }
  return DualSenseConnectionType.Unknown
}

export async function getInitialFirmwareInfo(item: DeviceItem): Promise<DualSenseInitialFirmwareInfo> {
  const { device } = item
  const data = await device.receiveFeatureReport(0x20)
  console.log('firmware data', data.buffer)

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

export async function sendFeatureReport(item: DeviceItem, reportId: number, data: ArrayBuffer) {
  const { device, connectionType } = item
  const featureReportMeta = device.collections[0]?.featureReports?.find(report => report.reportId === reportId)
  if (!featureReportMeta) {
    throw new Error('Feature report not found')
  }
  const idealLength = featureReportMeta.items?.[0]?.reportCount ?? 0
  // const idealLength = featureReportMeta.items?.reduce((sum, item) => sum + (item?.reportCount ?? 0), 0)
  if (!idealLength) {
    throw new Error('Invalid feature report')
  }
  // if (data.byteLength > idealLength) {
  //   throw new Error('Data too long')
  // }
  const newData = new Uint8Array(idealLength)
  newData.set(new Uint8Array(data))

  if (connectionType === DualSenseConnectionType.USB) {
    console.log('sendFeatureReport', reportId, data, newData)
    await device.sendFeatureReport(reportId, newData)
  }
  else if (connectionType === DualSenseConnectionType.Bluetooth) {
    fillFeatureReportChecksum(reportId, newData)
    console.log('sendFeatureReport', reportId, data, newData)
    await device.sendFeatureReport(reportId, newData)
  }
}

export async function sendFeatureReportWithError(item: DeviceItem, reportId: number, data: ArrayBuffer) {
  try {
    await sendFeatureReport(item, reportId, data)
  }
  catch (error) {
    console.error(error)
    return false
  }

  return true
}

export async function receiveFeatureReport(item: DeviceItem, reportId: number): Promise<DataView> {
  const { device } = item
  const result = await device.receiveFeatureReport(reportId)
  console.log('receiveFeatureReport', reportId, result)
  return result
}

export async function receiveFeatureReportWithError(item: DeviceItem, reportId: number) {
  try {
    return await receiveFeatureReport(item, reportId)
  }
  catch (error) {
    console.error(error)
    return false
  }
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getTestResult(
  item: DeviceItem,
  deviceId: DualSenseTestDeviceId,
  actionId: DualSenseTestActionId,
): Promise<{
  result: TestResult
  report: DataView
} | {
  result: TestResult.TEST_RESULT_FAIL | TestResult.TEST_RESULT_TIMEOUT
  report: null
}> {
  let report: DataView
  try {
    // eslint-disable-next-line no-cond-assign
    while (report = await receiveFeatureReport(item, 0x81)) {
      if (report.getUint8(0) === 0x81 && report.getUint8(1) === deviceId && report.getUint8(2) === actionId) {
        const result = report.getUint8(3)
        switch (result) {
          case TestStatus.TEST_STATUS_COMPLETE:
            return {
              result: TestResult.TEST_RESULT_COMPLETE,
              report,
            }
          case TestStatus.TEST_STATUS_COMPLETE_2:
            return {
              result: TestResult.TEST_RESULT_COMPLETE_2,
              report,
            }
        }
      }
      await sleep(10)
    }
  }
  catch (error) {
    console.error(error)
  }
  return {
    result: TestResult.TEST_RESULT_FAIL,
    report: null,
  }
}

export async function sendTestCommand(
  item: DeviceItem,
  deviceId: DualSenseTestDeviceId,
  actionId: DualSenseTestActionId,
  resultLength: number,
): Promise<{
  result: TestResult
  report: DataView
} | {
  result: TestResult.TEST_RESULT_SET_FAIL | TestResult.TEST_RESULT_TIMEOUT
  report: null
}> {
  const data = new Uint8Array(2)
  data[0] = deviceId
  data[1] = actionId
  try {
    await sendFeatureReport(item, 0x80, data)
  }
  catch (error) {
    console.error(error)
    return {
      result: TestResult.TEST_RESULT_SET_FAIL,
      report: null,
    }
  }
  let testResult: TestResult
  let num = 0
  const resultReport = new Uint8Array(resultLength)
  do {
    const resp = await getTestResult(item, deviceId, actionId)
    testResult = resp.result
    switch (resp.result) {
      case TestResult.TEST_RESULT_COMPLETE:
        resultReport.set(new Uint8Array(resp.report.buffer, 4, resultLength - 56 * num), 56 * num)
        ++num
        break
      case TestResult.TEST_RESULT_COMPLETE_2:
        resultReport.set(new Uint8Array(resp.report.buffer, 4, 56), 56 * num++)
        break
      case TestResult.TEST_RESULT_FAIL:
        return {
          result: TestResult.TEST_RESULT_SET_FAIL,
          report: null,
        }
    }
  } while (testResult !== TestResult.TEST_RESULT_COMPLETE)
  return {
    result: testResult,
    report: new DataView(resultReport.buffer),
  }
}

export async function sendTestCommandWithParams(
  item: DeviceItem,
  deviceId: DualSenseTestDeviceId,
  actionId: DualSenseTestActionId,
  params: DataView,
  resultLength: number,
  ignoreLength = 0,
): Promise<{
  result: TestResult
  report: DataView
} | {
  result: TestResult.TEST_RESULT_SET_FAIL | TestResult.TEST_RESULT_TIMEOUT
  report: null
}> {
  const data = new Uint8Array(2 + params.byteLength)
  data[0] = deviceId
  data[1] = actionId
  data.set(new Uint8Array(params.buffer), 2)
  try {
    await sendFeatureReport(item, 0x80, data)
  }
  catch (error) {
    console.error(error)
    return {
      result: TestResult.TEST_RESULT_SET_FAIL,
      report: null,
    }
  }
  let testResult: TestResult
  let num = 0
  const paramsLength = params.byteLength
  const resultReport = new Uint8Array(resultLength)
  do {
    const resp = await getTestResult(item, deviceId, actionId)
    testResult = resp.result
    switch (resp.result) {
      case TestResult.TEST_RESULT_COMPLETE:
        if (paramsLength - (56 - ignoreLength) * num > 56 - ignoreLength) {
          resultReport.set(new Uint8Array(resp.report.buffer, 4 + ignoreLength, 56 - ignoreLength), (56 - ignoreLength) * num++)
        }
        resultReport.set(new Uint8Array(resp.report.buffer, 4 + ignoreLength, resultLength - (56 - ignoreLength) * num), (56 - ignoreLength) * num)
        ++num
        break
      case TestResult.TEST_RESULT_COMPLETE_2:
        resultReport.set(new Uint8Array(resp.report.buffer, 4 + ignoreLength, 56 - ignoreLength), (56 - ignoreLength) * num++)
        break
      case TestResult.TEST_RESULT_FAIL:
        return {
          result: TestResult.TEST_RESULT_SET_FAIL,
          report: null,
        }
    }
  } while (testResult !== TestResult.TEST_RESULT_COMPLETE)
  return {
    result: testResult,
    report: new DataView(resultReport.buffer),
  }
}

export async function sendTestCommandPure(
  item: DeviceItem,
  deviceId: DualSenseTestDeviceId,
  actionId: DualSenseTestActionId,
  resultLength: number,
) {
  const resp = await sendTestCommand(item, deviceId, actionId, resultLength)
  if (resp.result !== TestResult.TEST_RESULT_COMPLETE) {
    return undefined
  }
  return resp.report
}

export async function getPcbaId(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_PCBAID, 6)
  console.log('GetPcbaId', report)
  if (!report) {
    return report
  }
  const pcbaId
    = BigInt(report.getUint8(0))
      + (BigInt(report.getUint8(1)) << 8n)
      + (BigInt(report.getUint8(2)) << 16n)
      + (BigInt(report.getUint8(3)) << 24n)
      + (BigInt(report.getUint8(4)) << 32n)
      + (BigInt(report.getUint8(5)) << 40n)

  return pcbaId
}

export async function getPcbaIdFull(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_PCBAID_FULL, 24)
  console.log('GetPcbaIdFull', report)
  return report
}

export async function getSerialNumber(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_SERIAL_NUMBER, 32)
  console.log('GetSerialNumber', report)
  return report
}

export async function getAssemblePartsInfo(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_ASSEMBLE_PARTS_INFO, 32)
  console.log('GetSerialNumber', report)
  return report
}

export async function getBatteryBarcode(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_BATTERY_BARCODE, 32)
  console.log('GetBatteryBarcode', report)
  return report
}

export async function getVcmBarcode(item: DeviceItem) {
  const leftReport = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_VCM_LEFT_BARCODE, 32)
  const rightReport = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_VCM_RIGHT_BARCODE, 32)
  console.log('GetVcmBarcode', leftReport, rightReport)
  return {
    left: leftReport,
    right: rightReport,
  }
}

export async function getUniqueId(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.GET_MCU_UNIQUE_ID, 9)
  if (!report || report.getUint8(0) !== 0) {
    console.log('GetUniqueId', report)
    return undefined
  }

  const result = report.getBigUint64(1, true)
  console.log('GetUniqueId', report, result)
  return result
}

export async function getBdMacAddress(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.BLUETOOTH, DualSenseTestActionId.READ_BDADR, 6)
  if (!report) {
    console.log('GetBdMacAddress', report)
    return undefined
  }
  const result = BigInt(report.getUint8(0))
    + (BigInt(report.getUint8(1)) << 8n)
    + (BigInt(report.getUint8(2)) << 16n)
    + (BigInt(report.getUint8(3)) << 24n)
    + (BigInt(report.getUint8(4)) << 32n)
    + (BigInt(report.getUint8(5)) << 40n)

  console.log('GetBdMacAddress', report, result)
  return result
}

export async function getBtPatchInfo(item: DeviceItem) {
  const report = await receiveFeatureReport(item, 0x22)
  if (report.getUint8(0) !== 0x22) {
    console.log('GetBtPatchInfo', report)
    return undefined
  }
  const result = report.getUint32(31, true)
  console.log('GetBtPatchInfo', report, result)
  return result
}

export async function getIndividualDataVerifyStatus(item: DeviceItem) {
  let status = 'no_data'
  const report = new Uint8Array(2)
  report[0] = 2
  report[1] = 0
  if (!await sendFeatureReportWithError(item, 0x84, report.buffer)) {
    status = 'start_error'
  }
  else {
    await sleep(50)
    let num = 0
    let featureReport: DataView | false
    while (true) {
      featureReport = await receiveFeatureReport(item, 0x85)
      if (!featureReport) {
        status = 'get_error'
        break
      }
      if (featureReport.getUint8(2) === 1) {
        status = 'successful'
        break
      }
      if (featureReport.getUint8(2) === 240) {
        ++num
        if (num >= 20) {
          status = 'retry_timeout'
          break
        }
        await sleep(50)
      }
      else {
        status = 'fail'
        break
      }
    }
  }
  console.log('GetIndividualDataVerifyStatus', status)
  return status
}

export function numToTwoDigitHex(num: number) {
  return num.toString(16).padStart(2, '0').toUpperCase()
}

export function formatUpdateVersion(ver: number) {
  return `${numberToHex((ver >> 8) & 0xFF)}.${numberToHex(ver & 0xFF, 2)}`
}

export function formatThreePartVersion(ver: number) {
  return `${(ver >> 24) & 0xFF}.${(ver >> 16) & 0xFF}.${ver & 0xFFFF}`
}

export function formatDspVersion(ver: number) {
  return `${numberToHex((ver >> 16) & 0xFFFF, 4)}_${numberToHex(ver & 0xFFFF, 4)}`
}

export function getPcbaIdFullString(pcbaIdFull: DataView, hwInfo: number, digits = 14) {
  // const isAsciiPcbaId = (hwInfo & 0xFFFF) >= 785
  const isAsciiPcbaId = true

  if (isAsciiPcbaId) {
    return decodeShiftJIS(pcbaIdFull).trimEnd().split('').reverse().join('')
  }

  if (pcbaIdFull.byteLength !== 24) {
    return ''
  }

  const number1 = pcbaIdFull.getBigUint64(0, true)
  const number2 = pcbaIdFull.getBigUint64(8, true)
  const number3 = pcbaIdFull.getBigUint64(16, true)

  const digits1 = digits - 32 > 0 ? digits - 32 : 0
  let digits2 = digits - 16 > 0 ? digits - 16 : 0
  let digits3 = digits - digits1 - digits2

  let str = '0x'

  if (number1 !== 0n || digits1 > 0) {
    str += numberToHex(number1, digits1)
    digits2 = 16
    digits3 = 16
  }

  if (number2 !== 0n || digits2 > 0) {
    str += numberToHex(number2, digits2)
    digits3 = 16
  }

  str += numberToHex(number3, digits3)

  return str
}

export async function type2TracabilityInfoRead(item: DeviceItem, type: 'left' | 'right') {
  let flag = false
  let motorInfo = ''
  let serialNo = '\u202D\u202C'
  const payload = new Uint8Array(1)
  payload[0] = type === 'left' ? 1 : 2
  const resp = await sendTestCommandWithParams(item, DualSenseTestDeviceId.ADAPTIVE_TRIGGER, DualSenseTestActionId.CYPRESS_SIGNAL_STEP_2, new DataView(payload.buffer), 43)
  switch (resp.result) {
    case TestResult.TEST_RESULT_COMPLETE:
      flag = resp.report.getUint8(0) === 0
      if (flag) {
        const rawSerialNo = new DataView(resp.report.buffer, 12, 7)
        const rawMotorInfo = new DataView(resp.report.buffer, 19, 8)

        for (let i = 0; i < 7; i++) {
          serialNo += numToTwoDigitHex(rawSerialNo.getUint8(i))
        }

        motorInfo = shiftJISDecoder.decode(rawMotorInfo).replace(/\0/g, '')
        break
      }
      break
  }

  if (flag) {
    console.log('Type2TracabilityInfoRead', type, motorInfo, serialNo)
    return { motorInfo, serialNo }
  }
  else {
    console.log('Type2TracabilityInfoRead', type, 'fail')
    return undefined
  }
}

/**
 * A demo function to test which command is available for the DualSense
 * @param item HIDDevice
 * @returns void
 */
export async function demoTestCommand(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.GET_OLYMPUS_CONFIG, 10)
  console.log('demoTestCommand', report)
}

export function createLabeledValueItem(label: string, value: string, valueLocalePrefix?: string): LabeledValueItem {
  return {
    label,
    value,
    valueLocalePrefix,
  }
}

export async function getDeviceInfo(item: DeviceItem): Promise<LabeledValueItem[]> {
  const { device, connectionType } = item
  const { productName, productId, vendorId } = device

  console.log(device)

  const deviceInfo: Partial<DualSenseDeviceInfo> = {
    deviceName: productName,
    vendorId,
    productId,
  }

  // demoTestCommand(item)

  const result: LabeledValueItem[] = []

  const firmwareInfo = await getInitialFirmwareInfo(item)

  result.push(createLabeledValueItem('Build Time', `${firmwareInfo.buildDate} ${firmwareInfo.buildTime}`))
  result.push(createLabeledValueItem('HW Info', numberToXHex(firmwareInfo.hwInfo, 8)))
  result.push(createLabeledValueItem('Device Info', `0x${mapDataViewToU8Hex(firmwareInfo.deviceInfo, true)}`))
  result.push(createLabeledValueItem('FW Type', numberToXHex(firmwareInfo.fwType, 4)))
  result.push(createLabeledValueItem('SW Series', numberToXHex(firmwareInfo.swSeries, 4)))
  result.push(createLabeledValueItem('Update Version', formatUpdateVersion(firmwareInfo.updateVersion)))
  result.push(createLabeledValueItem('SBL FW Version', formatThreePartVersion(firmwareInfo.sblFwVersion)))
  result.push(createLabeledValueItem('Main FW Version', formatThreePartVersion(firmwareInfo.mainFwVersion)))
  result.push(createLabeledValueItem('DSP FW Version', formatDspVersion(firmwareInfo.dspFwVersion)))
  result.push(createLabeledValueItem('MCU DSP FW Version', formatThreePartVersion(firmwareInfo.spiderDspFwVersion)))

  // const doesEnableNewTracabilityInfo = (firmwareInfo.hwInfo & 0xFFFF) >= 777
  //   && firmwareInfo.mainFwVersion >= 65655
  const doesEnableNewTracabilityInfo = true
  // const hasAdditionalAtTracabilityInfo = (firmwareInfo.hwInfo & 0xFFFF) >= 777
  const hasAdditionalAtTracabilityInfo = true
  if ([2, 3].includes(firmwareInfo.fwType)) {
    if (doesEnableNewTracabilityInfo) {
      const btPatchInfo = await getBtPatchInfo(item)
      btPatchInfo && result.push(createLabeledValueItem('BT Patch Version', numberToXHex(btPatchInfo, 8)))
      const pcbaIdFull = await getPcbaIdFull(item)
      pcbaIdFull && result.push(createLabeledValueItem('PCBA ID', getPcbaIdFullString(pcbaIdFull, firmwareInfo.hwInfo)))
      const serialNumber = await getSerialNumber(item)
      serialNumber && result.push(createLabeledValueItem('Serial Number', decodeShiftJIS(serialNumber)))
      const assemblePartsInfo = await getAssemblePartsInfo(item)
      assemblePartsInfo && result.push(createLabeledValueItem('Assemble Parts Info', `0x${mapDataViewToU8Hex(assemblePartsInfo, true)}`))
      const batteryBarcode = await getBatteryBarcode(item)
      batteryBarcode && result.push(createLabeledValueItem('Battery Barcode', decodeShiftJIS(batteryBarcode)))
      const { left, right } = await getVcmBarcode(item)
      notAllFalsy(left, right) && result.push(createLabeledValueItem('VCM Barcode', pairedValue(decodeShiftJIS(left), decodeShiftJIS(right))))
    }
    else {
      const pcbaId = await getPcbaId(item)
      pcbaId && result.push(createLabeledValueItem('PCBA ID', numberToXHex(pcbaId, 12)))
    }
    const uniqueId = await getUniqueId(item)
    uniqueId && result.push(createLabeledValueItem('Unique ID', numberToXHex(uniqueId, 16)))
    const bdMacAddress = await getBdMacAddress(item)
    bdMacAddress && result.push(createLabeledValueItem('BD MAC Address', numberToMacAddress(bdMacAddress)))

    if (hasAdditionalAtTracabilityInfo) {
      const leftTracabilityInfo = await type2TracabilityInfoRead(item, 'left')
      const rightTracabilityInfo = await type2TracabilityInfoRead(item, 'right')

      notAllFalsy(leftTracabilityInfo, rightTracabilityInfo) && result.push(createLabeledValueItem('AT Serial No.', pairedValue(leftTracabilityInfo?.serialNo, rightTracabilityInfo?.serialNo)))
      notAllFalsy(leftTracabilityInfo, rightTracabilityInfo) && result.push(createLabeledValueItem('AT Motor Info', pairedValue(leftTracabilityInfo?.motorInfo, rightTracabilityInfo?.motorInfo)))

      deviceInfo.atSerialNoLeft = leftTracabilityInfo?.serialNo
      deviceInfo.atSerialNoRight = rightTracabilityInfo?.serialNo
      deviceInfo.atMotorInfoLeft = leftTracabilityInfo?.motorInfo
      deviceInfo.atMotorInfoRight = rightTracabilityInfo?.motorInfo
    }

    if (connectionType === DualSenseConnectionType.USB) {
      const individualDataVerifyStatus = await getIndividualDataVerifyStatus(item)
      result.push(createLabeledValueItem('IndividualData Verify', individualDataVerifyStatus))
    }
    else {
      result.push(createLabeledValueItem('IndividualData Verify', 'not_supported'))
    }
  }

  return result
}

export const inputReportOffsetUSB = createInputReportOffset(true)
export const inputReportOffsetBluetooth = createInputReportOffset(false)

export function createInputReportOffset(usb: boolean): InputReportOffset {
  const num = usb ? 0 : 1
  const offset: InputReportOffset = {
    analogStickLX: 0 + num,
    analogStickLY: 1 + num,
    analogStickRX: 2 + num,
    analogStickRY: 3 + num,
    analogTriggerL: 4 + num,
    analogTriggerR: 5 + num,
    sequenceNum: 6 + num,
    digitalKeys: 7 + num,
    incrementalNumber: 11 + num,
    gyroPitch: 15 + num,
    gyroYaw: 17 + num,
    gyroRoll: 19 + num,
    accelX: 21 + num,
    accelY: 23 + num,
    accelZ: 25 + num,
    motionTimeStamp: 27 + num,
    motionTemperature: 31 + num,
    touchData: 32 + num,
    atStatus0: 41 + num,
    atStatus1: 42 + num,
    hostTimestamp: 43 + num,
    atStatus2: 47 + num,
    deviceTimestamp: 48 + num,
    triggerLevel: 49 + num,
    status0: 52 + num,
    status1: 53 + num,
    status2: 54 + num,
    aesCmac: 55 + num,
    seqTag: 0,
    crc32: 0,
  }

  if (!usb) {
    offset.crc32 = 73
  }

  return offset
}

export function chargeStatusToString(chargeType: number) {
  switch (chargeType) {
    case 0:
      return 'discharging'
    case 1:
      return 'charging'
    case 2:
      return 'charging_complete'
    case 10:
      return 'abnormal_voltage'
    case 11:
      return 'abnormal_temperature'
    case 15:
      return 'charging_error'
    default:
      return 'unknown'
  }
}

export function batteryLevelToString(batteryLevel: number) {
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

// Normalize an 8-bit thumbStick axis to the range [-1, +1].
export function normalizeThumbStickAxis(value: number) {
  return (2 * value) / 0xFF - 1.0
}

export function parseDualSenseInputReport(reportId: number, data: DataView, connectionType: DualSenseConnectionType): {
  seqNum: number
  labelResult: LabeledValueItem[]
  visualResult: DualSenseVisualResult
} | false {
  if (reportId === 0x01 || reportId === 0x31) {
    // if (connectionType !== DualSenseConnectionType.USB) {
    //   // validate the report
    //   const invalid = crc32([0xA1, reportId], data) !== 1486858134
    //   if (invalid) {
    //     console.error('Invalid input report', data)
    //     return false
    //   }
    // }

    const offset = connectionType === DualSenseConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth

    const result: LabeledValueItem[] = []

    const triangle = (data.getInt8(offset.digitalKeys) & 128) !== 0
    const circle = (data.getInt8(offset.digitalKeys) & 64) !== 0
    const cross = (data.getInt8(offset.digitalKeys) & 32) !== 0
    const square = (data.getInt8(offset.digitalKeys) & 16) !== 0
    const r3 = (data.getInt8(offset.digitalKeys + 1) & 128) !== 0
    const l3 = (data.getInt8(offset.digitalKeys + 1) & 64) !== 0
    const option = (data.getInt8(offset.digitalKeys + 1) & 32) !== 0
    const create = (data.getInt8(offset.digitalKeys + 1) & 16) !== 0
    const r2 = (data.getInt8(offset.digitalKeys + 1) & 8) !== 0
    const l2 = (data.getInt8(offset.digitalKeys + 1) & 4) !== 0
    const r1 = (data.getInt8(offset.digitalKeys + 1) & 2) !== 0
    const l1 = (data.getInt8(offset.digitalKeys + 1) & 1) !== 0
    const bR = (data.getInt8(offset.digitalKeys + 2) & 128) !== 0
    const bL = (data.getInt8(offset.digitalKeys + 2) & 64) !== 0
    const fnR = (data.getInt8(offset.digitalKeys + 2) & 32) !== 0
    const fnL = (data.getInt8(offset.digitalKeys + 2) & 16) !== 0
    const mic = (data.getInt8(offset.digitalKeys + 2) & 4) !== 0
    const touchpad = (data.getInt8(offset.digitalKeys + 2) & 2) !== 0
    const ps = (data.getInt8(offset.digitalKeys + 2) & 1) !== 0

    const direction = data.getInt8(offset.digitalKeys) & 15
    const up = direction === DPadDirection.U || direction === DPadDirection.UR || direction === DPadDirection.UL
    const right = direction === DPadDirection.R || direction === DPadDirection.UR || direction === DPadDirection.RD
    const down = direction === DPadDirection.D || direction === DPadDirection.RD || direction === DPadDirection.LD
    const left = direction === DPadDirection.L || direction === DPadDirection.UL || direction === DPadDirection.LD
    const num1 = data.getInt8(offset.status0) >> 4 & 15
    const num2 = data.getUint8(offset.status0) & 15

    const triggerLevel = data.getUint8(offset.triggerLevel)
    const triggerLevelR = triggerLevel >> 6
    const triggerLevelL = (triggerLevel >> 4) & 3

    const detectMic = data.getInt8(offset.status1) & 2
    const detectHeadphone = data.getInt8(offset.status1) & 1

    const triggerL = data.getUint8(offset.analogTriggerL)
    const triggerR = data.getUint8(offset.analogTriggerR)

    const stickLX = data.getUint8(offset.analogStickLX)
    const stickLY = data.getUint8(offset.analogStickLY)
    const stickRX = data.getUint8(offset.analogStickRX)
    const stickRY = data.getUint8(offset.analogStickRY)

    const gyroPitch = data.getInt16(offset.gyroPitch, true)
    const gyroYaw = data.getInt16(offset.gyroYaw, true)
    const gyroRoll = data.getInt16(offset.gyroRoll, true)

    const accelX = data.getInt16(offset.accelX, true)
    const accelY = data.getInt16(offset.accelY, true)
    const accelZ = data.getInt16(offset.accelZ, true)

    const seqNum = data.getUint8(offset.sequenceNum)

    result.push(createLabeledValueItem('connect_panel.charge_status_label', chargeStatusToString(num1), 'connect_panel.charge_status'))
    result.push(createLabeledValueItem('connect_panel.battery_level_label', batteryLevelToString(num2), 'connect_panel.battery_level'))
    result.push(createLabeledValueItem('connect_panel.microphone_status_label', detectMic ? 'connected' : 'not_connected', 'connect_panel'))
    result.push(createLabeledValueItem('connect_panel.headphone_status_label', detectHeadphone ? 'connected' : 'not_connected', 'connect_panel'))

    const touchpadID1 = data.getUint8(offset.touchData)
    const touchpadX1 = ((data.getUint8(offset.touchData + 2) & 15) << 8) | (data.getUint8(offset.touchData + 1))
    const touchpadY1 = (data.getUint8(offset.touchData + 3) << 4) | (data.getUint8(offset.touchData + 2) >> 4)
    const touchpadID2 = data.getUint8(offset.touchData + 4)
    const touchpadX2 = ((data.getUint8(offset.touchData + 6) & 15) << 8) | (data.getUint8(offset.touchData + 5))
    const touchpadY2 = (data.getUint8(offset.touchData + 7) << 4) | (data.getUint8(offset.touchData + 6) >> 4)

    return {
      seqNum,
      labelResult: result,
      visualResult: {
        triangle,
        circle,
        cross,
        square,
        r3,
        l3,
        option,
        create,
        r2,
        l2,
        r1,
        l1,
        mic,
        touchpad,
        ps,
        up,
        right,
        down,
        left,
        fnR,
        fnL,
        bR,
        bL,
        triggerLevelL,
        triggerLevelR,
        triggerL,
        triggerR,
        stickLX: normalizeThumbStickAxis(stickLX),
        stickLY: normalizeThumbStickAxis(stickLY),
        stickRX: normalizeThumbStickAxis(stickRX),
        stickRY: normalizeThumbStickAxis(stickRY),
        gyroPitch,
        gyroYaw,
        gyroRoll,
        accelX,
        accelY,
        accelZ,
        touchpadID1,
        touchpadX1,
        touchpadY1,
        touchpadID2,
        touchpadX2,
        touchpadY2,
      },
    }
  }
  else {
    console.log('Invalid input report', reportId, data)
  }
  return false
}
