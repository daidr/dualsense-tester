import { shiftJISDecoder } from '@/utils/decoder.util'
import { decodeShiftJIS, numberToHex } from '@/utils/format.util'
import { hidLogger } from '@/utils/logger.util'
import { sleep } from '@/utils/time.util'
import { DeviceConnectionType, type DeviceItem } from '../shared'
import { fillFeatureReportChecksum } from './crc32.util'
import { DualSenseTestActionId, DualSenseTestDeviceId, TestResult, TestStatus } from './ds.type'

export const VENDOR_ID_SONY = 0x054C
export const PRODUCT_ID_DUALSENSE = 0x0CE6
export const PRODUCT_ID_DUALSENSE_EDGE = 0x0DF2
export const USAGE_PAGE_GENERIC_DESKTOP = 0x0001
export const USAGE_ID_GD_GAME_PAD = 0x0005

// Normalize an 8-bit thumbStick axis to the range [-1, +1].
export function normalizeThumbStickAxis(value: number) {
  return (2 * value) / 0xFF - 1.0
}

export function checkConnectionType(device: HIDDevice) {
  for (const c of device.collections) {
    if (c.usagePage !== USAGE_PAGE_GENERIC_DESKTOP || c.usage !== USAGE_ID_GD_GAME_PAD) {
      continue
    }

    const maxInputReportBytes = c.inputReports!.reduce((max, report) => {
      return Math.max(
        max,
        report.items!.reduce((sum, item) => {
          return sum + item.reportSize! * item.reportCount!
        }, 0),
      )
    }, 0)
    if (maxInputReportBytes === 504) {
      return DeviceConnectionType.USB
    }
    else if (maxInputReportBytes === 616) {
      return DeviceConnectionType.Bluetooth
    }
  }
  return DeviceConnectionType.Unknown
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

  if (connectionType === DeviceConnectionType.USB) {
    hidLogger.debug('sendFeatureReport', reportId, data, newData)
    await device.sendFeatureReport(reportId, newData)
  }
  else if (connectionType === DeviceConnectionType.Bluetooth) {
    fillFeatureReportChecksum(reportId, newData)
    hidLogger.debug('sendFeatureReport', reportId, data, newData)
    await device.sendFeatureReport(reportId, newData)
  }
}

export async function sendFeatureReportWithError(item: DeviceItem, reportId: number, data: ArrayBuffer) {
  try {
    await sendFeatureReport(item, reportId, data)
  }
  catch (error) {
    hidLogger.error(error)
    return false
  }

  return true
}

export async function receiveFeatureReport(item: DeviceItem, reportId: number): Promise<DataView> {
  const { device } = item
  const result = await device.receiveFeatureReport(reportId)
  hidLogger.debug('receiveFeatureReport', reportId, result)
  return result
}

export async function receiveFeatureReportWithError(item: DeviceItem, reportId: number) {
  try {
    return await receiveFeatureReport(item, reportId)
  }
  catch (error) {
    hidLogger.error(error)
    return false
  }
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
  hidLogger.debug('GetPcbaId', report)
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
  hidLogger.debug('GetPcbaIdFull', report)
  return report
}

export async function getSerialNumber(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_SERIAL_NUMBER, 32)
  hidLogger.debug('GetSerialNumber', report)
  return report
}

export async function getAssemblePartsInfo(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_ASSEMBLE_PARTS_INFO, 32)
  hidLogger.debug('GetSerialNumber', report)
  return report
}

export async function getBatteryBarcode(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_BATTERY_BARCODE, 32)
  hidLogger.debug('GetBatteryBarcode', report)
  return report
}

export async function getVcmBarcode(item: DeviceItem) {
  const leftReport = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_VCM_LEFT_BARCODE, 32)
  const rightReport = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.READ_VCM_RIGHT_BARCODE, 32)
  hidLogger.debug('GetVcmBarcode', leftReport, rightReport)
  return {
    left: leftReport,
    right: rightReport,
  }
}

export async function getUniqueId(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.SYSTEM, DualSenseTestActionId.GET_MCU_UNIQUE_ID, 9)
  if (!report || report.getUint8(0) !== 0) {
    hidLogger.debug('GetUniqueId', report)
    return undefined
  }

  const result = report.getBigUint64(1, true)
  hidLogger.debug('GetUniqueId', report, result)
  return result
}

export async function getBdMacAddress(item: DeviceItem) {
  const report = await sendTestCommandPure(item, DualSenseTestDeviceId.BLUETOOTH, DualSenseTestActionId.READ_BDADR, 6)
  if (!report) {
    hidLogger.debug('GetBdMacAddress', report)
    return undefined
  }
  const result = BigInt(report.getUint8(0))
    + (BigInt(report.getUint8(1)) << 8n)
    + (BigInt(report.getUint8(2)) << 16n)
    + (BigInt(report.getUint8(3)) << 24n)
    + (BigInt(report.getUint8(4)) << 32n)
    + (BigInt(report.getUint8(5)) << 40n)

  hidLogger.debug('GetBdMacAddress', report, result)
  return result
}

export async function getBtPatchInfo(item: DeviceItem) {
  const report = await receiveFeatureReport(item, 0x22)
  if (report.getUint8(0) !== 0x22) {
    hidLogger.debug('GetBtPatchInfo', report)
    return undefined
  }
  const result = report.getUint32(31, true)
  hidLogger.debug('GetBtPatchInfo', report, result)
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
  hidLogger.debug('GetIndividualDataVerifyStatus', status)
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
    hidLogger.debug('Type2TracabilityInfoRead', type, motorInfo, serialNo)
    return { motorInfo, serialNo }
  }
  else {
    hidLogger.debug('Type2TracabilityInfoRead', type, 'fail')
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
  hidLogger.debug('demoTestCommand', report)
}
