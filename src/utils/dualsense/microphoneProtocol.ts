import { fillOutputReportChecksum } from './crc32.util'

// HIDInputReportEvent.data excludes the HIDP prefix and report id.
export const BT_MIC_INPUT_REPORT_ID = 0x31
export const BT_MIC_CONTROL_REPORT_ID = 0x32
export const BT_MIC_OPUS_BYTES = 71

const BT_MIC_OPUS_OFFSET = 2
const BT_MIC_INPUT_MIN_BYTES = BT_MIC_OPUS_OFFSET + BT_MIC_OPUS_BYTES
const BT_INPUT_PAYLOAD_TYPE_MASK = 0x0F
const BT_INPUT_PAYLOAD_TYPE_CONTROL = 0x01
const BT_INPUT_PAYLOAD_TYPE_AUDIO = 0x02
const BT_CONTROL_MUTE_BUTTON_OFFSET = 10
const BT_CONTROL_HEADSET_STATUS_OFFSET = 54
const BT_CONTROL_MIN_BYTES = BT_CONTROL_HEADSET_STATUS_OFFSET + 1
const BT_CONTROL_MUTE_BUTTON_MASK = 0x04
const BT_CONTROL_HEADSET_MIC_MASK = 0x02

const BT_STATE_PAYLOAD_BYTES = 77
const BT_CONTROL_PAYLOAD_BYTES = 141
const BT_STATE_OFFSET = 2

export interface BtMicControlState {
  muteButtonDown: boolean
  headsetMicPlugged: boolean
}

export interface BtMicStateOptions {
  muted?: boolean
  headsetMicPlugged?: boolean
}

export function getBtMicControlState(reportId: number, data: DataView): BtMicControlState | null {
  if (
    reportId !== BT_MIC_INPUT_REPORT_ID
    || data.byteLength < BT_CONTROL_MIN_BYTES
    || (data.getUint8(0) & BT_INPUT_PAYLOAD_TYPE_MASK) !== BT_INPUT_PAYLOAD_TYPE_CONTROL
  ) {
    return null
  }

  return {
    muteButtonDown: (data.getUint8(BT_CONTROL_MUTE_BUTTON_OFFSET) & BT_CONTROL_MUTE_BUTTON_MASK) !== 0,
    headsetMicPlugged: (data.getUint8(BT_CONTROL_HEADSET_STATUS_OFFSET) & BT_CONTROL_HEADSET_MIC_MASK) !== 0,
  }
}

export function isBtMicAudioReport(reportId: number, data: DataView): boolean {
  return reportId === BT_MIC_INPUT_REPORT_ID
    && data.byteLength >= BT_MIC_INPUT_MIN_BYTES
    && (data.getUint8(0) & BT_INPUT_PAYLOAD_TYPE_MASK) === BT_INPUT_PAYLOAD_TYPE_AUDIO
}

export function getBtMicOpusPayload(reportId: number, data: DataView): Uint8Array<ArrayBuffer> | null {
  if (!isBtMicAudioReport(reportId, data)) {
    return null
  }

  const payload = new Uint8Array(BT_MIC_OPUS_BYTES)
  payload.set(new Uint8Array(
    data.buffer,
    data.byteOffset + BT_MIC_OPUS_OFFSET,
    BT_MIC_OPUS_BYTES,
  ))
  return payload
}

export function buildBtMicStateReport(
  sequence: number,
  active: boolean,
  options: BtMicStateOptions = {},
): Uint8Array<ArrayBuffer> {
  const { muted = false, headsetMicPlugged = false } = options
  const report = new Uint8Array(BT_STATE_PAYLOAD_BYTES)
  report[0] = (sequence & 0x0F) << 4
  report[1] = 0x10

  report[BT_STATE_OFFSET + 0] = 0xC0 // mic volume + audio control
  report[BT_STATE_OFFSET + 1] = 0x83 // mute LED + power save + audio control 2
  report[BT_STATE_OFFSET + 6] = active && !muted ? 0x08 : 0x00
  report[BT_STATE_OFFSET + 7] = headsetMicPlugged ? 0x08 : 0x09
  report[BT_STATE_OFFSET + 8] = muted ? 0x01 : 0x00
  report[BT_STATE_OFFSET + 9] = active && !muted ? 0x0F : 0x1F
  report[BT_STATE_OFFSET + 37] = 0x01

  fillOutputReportChecksum(BT_MIC_INPUT_REPORT_ID, report)
  return report
}

export function buildBtMicControlReport(sequence: number, active: boolean): Uint8Array<ArrayBuffer> {
  const report = new Uint8Array(BT_CONTROL_PAYLOAD_BYTES)
  report[0] = (sequence & 0x0F) << 4
  report[1] = 0x91
  report[2] = 0x07
  report[3] = active ? 0xFF : 0xFE
  report.fill(0x40, 4, 9)
  report[9] = sequence & 0x0F
  report[10] = 0x92
  report[11] = 0x40

  fillOutputReportChecksum(BT_MIC_CONTROL_REPORT_ID, report)
  return report
}
