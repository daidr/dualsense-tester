import { describe, expect, it } from 'vitest'
import {
  BT_MIC_OPUS_BYTES,
  buildBtMicControlReport,
  buildBtMicStateReport,
  getBtMicControlState,
  getBtMicOpusPayload,
  isBtMicAudioReport,
} from '@/utils/dualsense/microphoneProtocol'

describe('DualSense Bluetooth microphone protocol', () => {
  it('extracts only 71-byte Opus payloads from 0x31 audio input reports', () => {
    const report = new Uint8Array(77)
    report[0] = 0xA2
    for (let index = 0; index < BT_MIC_OPUS_BYTES; index++) {
      report[index + 2] = index
    }

    expect(isBtMicAudioReport(0x31, new DataView(report.buffer))).toBe(true)
    expect(Array.from(getBtMicOpusPayload(0x31, new DataView(report.buffer))!))
      .toEqual(Array.from({ length: BT_MIC_OPUS_BYTES }, (_, index) => index))

    report[0] = 0xA1
    expect(isBtMicAudioReport(0x31, new DataView(report.buffer))).toBe(false)
    expect(getBtMicOpusPayload(0x31, new DataView(report.buffer))).toBeNull()
    expect(getBtMicOpusPayload(0x01, new DataView(report.buffer))).toBeNull()
    expect(getBtMicOpusPayload(0x31, new DataView(new ArrayBuffer(72)))).toBeNull()
  })

  it('reads mute-button and headset-microphone state only from control reports', () => {
    const report = new Uint8Array(77)
    report[0] = 0xA1
    report[10] = 0x04
    report[54] = 0x02

    expect(getBtMicControlState(0x31, new DataView(report.buffer))).toEqual({
      muteButtonDown: true,
      headsetMicPlugged: true,
    })

    report[0] = 0xA2
    expect(getBtMicControlState(0x31, new DataView(report.buffer))).toBeNull()
  })

  it('builds the targeted 0x31 microphone state update', () => {
    const open = buildBtMicStateReport(3, true)
    const close = buildBtMicStateReport(4, false)

    expect(open).toHaveLength(77)
    expect(Array.from(open.slice(0, 12))).toEqual([
      0x30,
      0x10,
      0xC0,
      0x83,
      0x00,
      0x00,
      0x00,
      0x00,
      0x08,
      0x09,
      0x00,
      0x0F,
    ])
    expect(close[0]).toBe(0x40)
    expect(close[8]).toBe(0)
    expect(close[11]).toBe(0x1F)
    expect(Array.from(open.slice(-4))).toEqual([0xDC, 0x03, 0x2B, 0xBB])
    expect(Array.from(close.slice(-4))).toEqual([0xBB, 0x6E, 0xF9, 0x72])

    const mutedHeadset = buildBtMicStateReport(7, true, {
      muted: true,
      headsetMicPlugged: true,
    })
    expect(mutedHeadset[8]).toBe(0)
    expect(mutedHeadset[9]).toBe(0x08)
    expect(mutedHeadset[10]).toBe(1)
    expect(mutedHeadset[11]).toBe(0x1F)
  })

  it('builds the 0x32 microphone stream open and close controls', () => {
    const open = buildBtMicControlReport(5, true)
    const close = buildBtMicControlReport(6, false)

    expect(open).toHaveLength(141)
    expect(Array.from(open.slice(0, 12))).toEqual([
      0x50,
      0x91,
      0x07,
      0xFF,
      0x40,
      0x40,
      0x40,
      0x40,
      0x40,
      0x05,
      0x92,
      0x40,
    ])
    expect(close[0]).toBe(0x60)
    expect(close[3]).toBe(0xFE)
    expect(close[9]).toBe(0x06)
    expect(Array.from(open.slice(-4))).toEqual([0x2A, 0x3E, 0xA2, 0xDD])
    expect(Array.from(close.slice(-4))).toEqual([0x99, 0x03, 0xA6, 0xD7])
  })
})
