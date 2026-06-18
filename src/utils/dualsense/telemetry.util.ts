import type { DeviceItem } from '@/device-based-router/shared'
import { DualSenseTestActionId, DualSenseTestDeviceId } from '@/utils/dualsense/ds.type'
import { readPagedTestBlock } from '@/utils/dualsense/ds.util'
import { hidLogger } from '@/utils/logger.util'

/**
 * 手柄遥测计数器块（厂测扩展诊断块，deviceId 0x70 / action 1）的读取与解析。
 *
 * 数据来自手柄 NVRAM，未写入/带制造偏移的原始值会落在高位区间，需用下面的 read* 函数
 * 归一化，避免把空闪存（0xFF…）当成真实计数。
 */

/** 解析后的扁平字段集合（键同时用作 i18n label 后缀）。 */
export type TelemetryData = Record<string, number | string>

export interface TelemetryResult {
  /** 完整遥测块（固件支持时）。 */
  telemetry?: TelemetryData
  /** 旧固件降级路径：仅能读到累计使用时长（秒）。 */
  activeTimeSeconds?: number
}

// 完整块需要的固件 updateVersion 门槛；不足则降级只读累计使用时长。
const FULL_BLOCK_MIN_UPDATE_VERSION = 1106
const FULL_BLOCK_MIN_UPDATE_VERSION_EDGE = 374
// 分页读取页数（每页 56 字节，首字节为状态字）：普通结构到 offset 190(≈4 页)，
// Edge 到 256(≈5 页，留余量到 6)。设备发完会清空头部，readPagedTestBlock 据此提前结束。
const TELEMETRY_PAGES = 4
const TELEMETRY_PAGES_EDGE = 6

// #region NVRAM 容错解码
function readButtonCount(d: DataView, i: number): number {
  const v = d.getUint32(i, true)
  const low = v & 0xFFFF
  const high = (v >>> 16) & 0xFFFF
  if (high === 0) {
    return low
  }
  // 高低半字均为未初始化高位 → 视作 0
  if (high >= 0xFF00 && low >= 0xFF00) {
    return 0
  }
  return low
}

function readButtonCountHigh(d: DataView, i: number): number {
  const v = d.getUint16(i + 2, true)
  return v < 0xFF00 ? v : 0
}

function readLow(d: DataView, i: number): number {
  const v = d.getUint32(i, true) & 0xFFFFFF
  return v < 0xFFFF00 ? v : 0
}

function readUshortCounter(d: DataView, i: number): number {
  // 高字节是脏数据时退化为单字节
  return d.getUint8(i + 1) < 0xE0 ? d.getUint16(i, true) : d.getUint8(i)
}

function readEdgeRecordCount(d: DataView, i: number): number {
  const v = d.getUint32(i, true)
  if (v === 0xFFFFFFFF || v < 0xEDF00000) {
    return 0
  }
  // 减去制造偏移
  return v - 0xEDF00000
}

function readEdgeStrokeCount(d: DataView, i: number): number {
  const v = d.getUint32(i, true)
  const low = v & 0xFFFF
  const high = (v >>> 16) & 0xFFFF
  if (low >= 0xFF00) {
    const decoded = v - (high * 0x10000 + 0xFF00)
    if (decoded >= 0 && decoded < 100000) {
      return decoded
    }
  }
  return high === 0 ? low : v
}
// #endregion

function readAscii(d: DataView, off: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    const c = d.getUint8(off + i)
    if (c === 0) {
      break
    }
    s += String.fromCharCode(c)
  }
  return s
}

// 摇杆模块序列号：仅接受 0-9 / A-Z，遇非法字节即停（过滤 NVRAM 脏字节）。
function readAlphaNumPrefix(d: DataView, off: number, max: number): string {
  let s = ''
  for (let i = 0; i < max; i++) {
    const c = d.getUint8(off + i)
    const isDigit = c >= 0x30 && c <= 0x39
    const isUpper = c >= 0x41 && c <= 0x5A
    if (!isDigit && !isUpper) {
      break
    }
    s += String.fromCharCode(c)
  }
  return s
}

// 公共头（offset 0–85，普通/Edge 相同）。时长字段单位为秒。
function parseCommonHeader(d: DataView, isEdge: boolean): TelemetryData {
  return {
    peripheralSerialNumber: readAscii(d, 0, 17),
    totalRecordCount: isEdge ? readEdgeRecordCount(d, 17) : d.getUint32(17, true),
    totalActiveTime: readLow(d, 21),
    totalChargeTime: readLow(d, 25),
    hapticDeviceActiveTime: readLow(d, 29),
    adaptiveTriggerLeftActiveTime: readButtonCount(d, 33),
    adaptiveTriggerRightActiveTime: readButtonCount(d, 37),
    batteryChargeCount: readUshortCounter(d, 41),
    usbSdpDetectCount: d.getUint16(43, true),
    usbCdpDetectCount: readUshortCounter(d, 45),
    usbDcpDetectCount: d.getUint16(47, true),
    usbTypec15DetectCount: d.getUint16(49, true),
    usbTypec30DetectCount: d.getUint16(51, true),
    usbUnknownDetectCount: d.getUint16(53, true),
    batteryChargerConnectCount: d.getUint16(55, true),
    batteryChargeVoltageErrorCount: d.getUint8(57),
    batteryChargeTemperatureErrorCount: d.getUint8(58),
    batteryChargePmicErrorCount: d.getUint8(59),
    batteryFullChargeCount: d.getUint16(60, true),
    headsetDetectCount: d.getUint16(62, true),
    headphoneDetectCount: d.getUint16(64, true),
    usbConnectCount: d.getUint16(66, true),
    bluetoothConnectCount: d.getUint16(68, true),
    bluetoothConnectTimeoutCount: d.getUint16(70, true),
    subcpuStartupErrorCount: d.getUint16(72, true),
    authChallengeCount: readButtonCount(d, 74),
    authSuccessCount: readButtonCount(d, 78),
    authFailCount: readButtonCount(d, 82),
  }
}

// 普通 DualSense 分支（offset 86–189）。
function parseStandardBody(d: DataView, t: TelemetryData): void {
  t.leftStickXRoundTripCount = d.getUint32(86, true)
  t.leftStickXDynamicRangeValue = d.getUint16(90, true)
  t.leftStickYRoundTripCount = d.getUint32(92, true)
  t.leftStickYDynamicRangeValue = d.getUint16(96, true)
  t.rightStickXRoundTripCount = d.getUint32(98, true)
  t.rightStickXDynamicRangeValue = d.getUint16(102, true)
  t.rightStickYRoundTripCount = d.getUint32(104, true)
  t.rightStickYDynamicRangeValue = d.getUint16(108, true)

  const buttons: [string, number][] = [
    ['buttonDPadUp', 110],
    ['buttonDPadDown', 114],
    ['buttonDPadLeft', 118],
    ['buttonDPadRight', 122],
    ['buttonTriangle', 126],
    ['buttonCross', 130],
    ['buttonSquare', 134],
    ['buttonCircle', 138],
    ['buttonL1', 142],
    ['buttonL2', 146],
    ['buttonL3', 150],
    ['buttonR1', 154],
    ['buttonR2', 158],
    ['buttonR3', 162],
    ['touchpadTouchDetect', 166],
    ['touchpadPress', 170],
    ['buttonOption', 174],
    ['buttonCreate', 178],
    ['buttonPs', 182],
    ['buttonMute', 186],
  ]
  for (const [key, off] of buttons) {
    t[key] = readButtonCount(d, off)
  }
}

// DualSense Edge 分支（offset 86–255）：扳机分级行程、背键、两个可热插拔摇杆模块。
function parseEdgeBody(d: DataView, t: TelemetryData): void {
  const buttons: [string, number][] = [
    ['buttonDPadUp', 86],
    ['buttonDPadDown', 90],
    ['buttonDPadLeft', 94],
    ['buttonDPadRight', 98],
    ['buttonTriangle', 102],
    ['buttonCross', 106],
    ['buttonSquare', 110],
    ['buttonCircle', 114],
    ['buttonL1', 118],
    ['buttonR1', 134],
    ['touchpadTouchDetect', 150],
    ['touchpadPress', 154],
    ['buttonOption', 158],
    ['buttonCreate', 162],
    ['buttonPs', 166],
  ]
  for (const [key, off] of buttons) {
    t[key] = readButtonCount(d, off)
  }
  t.buttonL2ShortStroke = readEdgeStrokeCount(d, 122)
  t.buttonL2MiddleStroke = readEdgeStrokeCount(d, 126)
  t.buttonL2FullStroke = readEdgeStrokeCount(d, 130)
  t.buttonR2ShortStroke = readEdgeStrokeCount(d, 138)
  t.buttonR2MiddleStroke = readEdgeStrokeCount(d, 142)
  t.buttonR2FullStroke = readEdgeStrokeCount(d, 146)
  t.buttonMute = readButtonCountHigh(d, 170)
  t.buttonBackLeft = readButtonCountHigh(d, 174)
  t.buttonBackRight = readButtonCountHigh(d, 178)

  t.stickModuleLeftSerialNumber = readAlphaNumPrefix(d, 182, 17)
  t.stickModuleLeftXRoundTripCount = d.getUint32(199, true)
  t.stickModuleLeftXDynamicRangeValue = d.getUint16(203, true)
  t.stickModuleLeftYRoundTripCount = d.getUint32(205, true)
  t.stickModuleLeftYDynamicRangeValue = d.getUint16(209, true)
  t.stickModuleLeftButtonPressCount = d.getUint32(211, true)
  t.stickModuleLeftFunctionButtonPressCount = d.getUint32(215, true)

  t.stickModuleRightSerialNumber = readAlphaNumPrefix(d, 219, 17)
  t.stickModuleRightXRoundTripCount = d.getUint32(236, true)
  t.stickModuleRightXDynamicRangeValue = d.getUint16(240, true)
  t.stickModuleRightYRoundTripCount = d.getUint32(242, true)
  t.stickModuleRightYDynamicRangeValue = d.getUint16(246, true)
  t.stickModuleRightButtonPressCount = d.getUint32(248, true)
  t.stickModuleRightFunctionButtonPressCount = d.getUint32(252, true)
}

function parseTelemetry(d: DataView, isEdge: boolean): TelemetryData {
  const t = parseCommonHeader(d, isEdge)
  if (isEdge) {
    parseEdgeBody(d, t)
  }
  else {
    parseStandardBody(d, t)
  }
  return t
}

/** 把秒格式化为 `Xd Xh Xm Xs`（省略为 0 的高位）。 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const parts: string[] = []
  if (days) {
    parts.push(`${days}d`)
  }
  if (hours || days) {
    parts.push(`${hours}h`)
  }
  if (minutes || hours || days) {
    parts.push(`${minutes}m`)
  }
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

/**
 * 读取遥测块。固件支持时返回完整结构，否则降级只取累计使用时长。
 * 返回空对象表示读取失败（设备不响应该块）。
 */
export async function fetchTelemetry(item: DeviceItem, isEdge: boolean): Promise<TelemetryResult> {
  let updateVersion = 0
  try {
    const fw = await item.device.receiveFeatureReport(0x20)
    updateVersion = fw.getUint16(44, true)
  }
  catch (error) {
    hidLogger.error('telemetry: read firmware report failed', error)
  }

  const maxPages = isEdge ? TELEMETRY_PAGES_EDGE : TELEMETRY_PAGES
  const block = await readPagedTestBlock(item, DualSenseTestDeviceId.TELEMETRY, DualSenseTestActionId.GET_INFO, maxPages)
  if (!block) {
    return {}
  }
  hidLogger.debug('telemetry raw', isEdge, updateVersion, new Uint8Array(block.buffer))
  // 首字节为状态字，结构体从其后开始
  const data = new DataView(block.buffer, 1)

  const minVersion = isEdge ? FULL_BLOCK_MIN_UPDATE_VERSION_EDGE : FULL_BLOCK_MIN_UPDATE_VERSION
  if (updateVersion > minVersion) {
    return { telemetry: parseTelemetry(data, isEdge) }
  }
  // 旧固件块可能不完整，仅取累计使用时长
  return { activeTimeSeconds: readLow(data, 21) }
}
