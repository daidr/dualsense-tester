import type { MaybeRefOrGetter } from 'vue'
import { nextTick, reactive, ref, shallowReactive, shallowRef, toValue, watch } from 'vue'
import { useDevice } from '@/composables/useInjectValues'
import { utf16LEDecoder } from '@/utils/decoder.util'
import { fillProfileArrayReportChecksum } from '@/utils/dualsense/crc32.util'
import { receiveFeatureReport, sendFeatureReport } from '@/utils/dualsense/ds.util'
import { utf16LEEncoder } from '@/utils/encoder.util'
import { isDev } from '@/utils/env.util'
import { leBufferToTimestamp, timestampToLEBuffer } from '@/utils/time.util'

export enum DSEProfileSwitchButton {
  Unknown = 0x00,
  Square = 0x60,
  Cross = 0x61,
  Circle = 0x62,
  Triangle = 0x63, // DEFAULT
}

export enum DSEJoystickProfilePreset {
  // 默认
  DEFAULT = 0x00,
  // 快速
  QUICK = 0x01,
  // 精确
  PRECISE = 0x02,
  // 稳定
  STEADY = 0x03,
  // 数字
  DIGITAL = 0x04,
  // 动态
  DYNAMIC = 0x05,
}

export interface DSEJoystickProfile {
  preset: DSEJoystickProfilePreset
  curvePoints: number[]
}

class DSEJoystickCurvePos {
  private value: number
  private delta?: number
  private affectedDeadzone?: boolean

  get rawValue() {
    return this.value
  }

  get rawDelta() {
    return this.delta ?? 0
  }

  get rawAffectedDeadzone() {
    return this.affectedDeadzone ?? true
  }

  constructor(value: number, params: {
    d?: number
    a?: boolean
  } = {}) {
    this.value = value
    this.delta = params.d ?? 0
    this.affectedDeadzone = params.a ?? true
  }

  getValue(deadzone = 0, adjustment = 0): number {
    if (!this.delta) {
      if (!this.affectedDeadzone) {
        return this.value
      }
      return Math.round(255 * deadzone + (1 - deadzone) * this.value)
    }

    if (!this.affectedDeadzone) {
      return Math.round(this.value + this.delta * adjustment)
    }

    const finalValue = Math.round(this.value * (1 - deadzone) + 255 * deadzone) + this.delta * adjustment
    return Math.floor(finalValue)
  }
}

export type DSEJoystickCurveParams = {
  /**
   * Whether curve adjustment is supported
   */
  adjustment: false
  /**
   * Number of curve points
   */
  pointCount: number
  /**
   * Curve points, each point is a tuple of [x, y] coordinates
   */
  points: [DSEJoystickCurvePos, DSEJoystickCurvePos][]
} | {
  /**
   * Whether curve adjustment is supported
   */
  adjustment: true
  /**
   * Number of curve points
   */
  pointCount: number
  /**
   * Curve points, each point is a tuple of [x, y] coordinates
   */
  points: [DSEJoystickCurvePos, DSEJoystickCurvePos][]
  /**
   * Adjustment reverse function
   */
  reversePointIndex: number
}

export class DSEJoystickCurve {
  readonly curveParams: DSEJoystickCurveParams

  readonly flattenPoints: DSEJoystickCurvePos[]

  readonly adjustmentCache: Map<string, number> = new Map()

  getDeadzone(points: number[]) {
    if (points[0] === 0) {
      return 0
    }
    return Math.round(points[0] / 2.55) / 100
  }

  getDefaultCurve(deadzone = 0) {
    return this.getCurve(deadzone)
  }

  getCurve(deadzone = 0, adjustment = 0) {
    return this.flattenPoints.map(point => point.getValue(deadzone, adjustment))
  }

  getAdjustment(points: number[]) {
    if (!this.curveParams.adjustment) {
      return Number.NaN
    }

    const deadzone = this.getDeadzone(points)

    const currentPointValue = points[this.curveParams.reversePointIndex]

    const key = `${deadzone}-${currentPointValue}`

    // const cache = this.adjustmentCache.get(key)
    // if (cache !== undefined) {
    //   return cache
    // }

    const point = this.flattenPoints[this.curveParams.reversePointIndex]

    const rawValue = point.rawValue
    const rawDelta = point.rawDelta
    const affectedDeadzone = point.rawAffectedDeadzone

    let adjustment = 0

    if (affectedDeadzone) {
      adjustment = Math.round((currentPointValue - rawValue * (1 - deadzone) - 255 * deadzone) / rawDelta)
    }
    else {
      adjustment = Math.round((currentPointValue - rawValue) / rawDelta)
    }

    adjustment = Math.max(-5, Math.min(adjustment, 5))

    // this.adjustmentCache.set(key, adjustment)
    return adjustment
  }

  constructor(params: DSEJoystickCurveParams) {
    this.curveParams = params
    this.flattenPoints = this.curveParams.points.flat()
  }
}

export const DSEJoystickCurveMap: Record<DSEJoystickProfilePreset, DSEJoystickCurve> = {
  [DSEJoystickProfilePreset.DEFAULT]: new DSEJoystickCurve({
    adjustment: false,
    pointCount: 3,
    points: [
      [
        new DSEJoystickCurvePos(0),
        new DSEJoystickCurvePos(0, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(128),
        new DSEJoystickCurvePos(128, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(196),
        new DSEJoystickCurvePos(196, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(225),
        new DSEJoystickCurvePos(225, { a: false }),
      ],
    ],
  }),
  [DSEJoystickProfilePreset.QUICK]: new DSEJoystickCurve({
    adjustment: true,
    pointCount: 3,
    points: [
      [
        new DSEJoystickCurvePos(0),
        new DSEJoystickCurvePos(0, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(38),
        new DSEJoystickCurvePos(38, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(107, {
          d: -3,
        }),
        new DSEJoystickCurvePos(167, {
          d: 5.5,
          a: false,
        }),
      ],
      [
        new DSEJoystickCurvePos(255),
        new DSEJoystickCurvePos(255, {
          a: false,
        }),
      ],
    ],
    reversePointIndex: 4,
  }),
  [DSEJoystickProfilePreset.PRECISE]: new DSEJoystickCurve({
    adjustment: true,
    pointCount: 4,
    points: [
      [
        new DSEJoystickCurvePos(0),
        new DSEJoystickCurvePos(0, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(85, { d: 3 }),
        new DSEJoystickCurvePos(40, { d: -3.5, a: false }),
      ],
      [
        new DSEJoystickCurvePos(149, { d: 3 }),
        new DSEJoystickCurvePos(83, { d: -6.5, a: false }),
      ],
      [
        new DSEJoystickCurvePos(206, { d: 2 }),
        new DSEJoystickCurvePos(140, { d: -7.5, a: false }),
      ],
    ],
    reversePointIndex: 2,
  }),
  [DSEJoystickProfilePreset.STEADY]: new DSEJoystickCurve({
    adjustment: true,
    pointCount: 4,
    points: [
      [
        new DSEJoystickCurvePos(0),
        new DSEJoystickCurvePos(0, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(57, { d: -1 }),
        new DSEJoystickCurvePos(57, { d: -1, a: false }),
      ],
      [
        new DSEJoystickCurvePos(100, { d: -4 }),
        new DSEJoystickCurvePos(127, { d: -0.5, a: false }),
      ],
      [
        new DSEJoystickCurvePos(210, { d: 2.5 }),
        new DSEJoystickCurvePos(152, { d: -5.5, a: false }),
      ],
    ],
    reversePointIndex: 4,
  }),
  [DSEJoystickProfilePreset.DIGITAL]: new DSEJoystickCurve({
    adjustment: true,
    pointCount: 3,
    points: [
      [
        new DSEJoystickCurvePos(0),
        new DSEJoystickCurvePos(0, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(38),
        new DSEJoystickCurvePos(38, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(38),
        new DSEJoystickCurvePos(165, { d: 18, a: false }),
      ],
      [
        new DSEJoystickCurvePos(255),
        new DSEJoystickCurvePos(255, { a: false }),
      ],
    ],
    reversePointIndex: 5,
  }),
  [DSEJoystickProfilePreset.DYNAMIC]: new DSEJoystickCurve({
    adjustment: true,
    pointCount: 3,
    points: [
      [
        new DSEJoystickCurvePos(0),
        new DSEJoystickCurvePos(0, { a: false }),
      ],
      [
        new DSEJoystickCurvePos(82, { d: 2.5 }),
        new DSEJoystickCurvePos(40, { d: -3.5, a: false }),
      ],
      [
        new DSEJoystickCurvePos(161, { d: -4.5 }),
        new DSEJoystickCurvePos(213, { d: 3, a: false }),
      ],
      [
        new DSEJoystickCurvePos(255),
        new DSEJoystickCurvePos(255, { a: false }),
      ],
    ],
    reversePointIndex: 5,
  }),
}

export enum DSEProfileButton {
  LB,
  RB,
  UP,
  LEFT,
  DOWN,
  RIGHT,
  CIRCLE,
  CROSS,
  SQUARE,
  TRIANGLE,
  R1,
  R2,
  R3,
  L1,
  L2,
  L3,
  Create,
  Options,
  PS,
  Touchpad,
  TouchpadButton,
  LeftJoystick,
  RightJoystick,
  JOYSTICK_SWITCH,
}

export interface DSEProfileButtonDef {
  buttonId: number
  mappingIndex: number
  disabledIndex: number
  allowMapping: number
}

export const DSEProfileButtonDefMap = {
  // TODO

}

export enum DSEProfileDisabledButtonBitMap {
  LB = 16,
  RB = 17,
  UP = 7,
  LEFT = 6,
  DOWN = 5,
  RIGHT = 4,
  CIRCLE = 30,
  CROSS = 31,
  SQUARE = 1,
  TRIANGLE = 0,
  R1 = 23,
  R2 = 19,
  R3 = 21,
  L1 = 20,
  L2 = 22,
  L3 = 18,
  CREATE = 3,
  OPTIONS = 2,
  PS = 13,
  TOUCHPAD = 9,
  TOUCHPAD_BUTTON = 8,
  LEFT_JOYSTICK = 15,
  RIGHT_JOYSTICK = 14,
  JOYSTICK_SWITCH = 24,
}

export const DSEProfileSwitchButtonMap: Record<number, DSEProfileSwitchButton> = {
  0: DSEProfileSwitchButton.Unknown,
  112: DSEProfileSwitchButton.Triangle,
  115: DSEProfileSwitchButton.Square,
  118: DSEProfileSwitchButton.Cross,
  121: DSEProfileSwitchButton.Circle,
}

export const DSEProfileSwitchButtonReverseMap: Record<DSEProfileSwitchButton, number> = {
  [DSEProfileSwitchButton.Unknown]: 0,
  [DSEProfileSwitchButton.Triangle]: 112,
  [DSEProfileSwitchButton.Square]: 115,
  [DSEProfileSwitchButton.Cross]: 118,
  [DSEProfileSwitchButton.Circle]: 121,
}

export type DSETriggerProfile = {
  unified: false
  left: number[]
  right: number[]
} | {
  unified: number[]
}

const profileUtils = {
  decodeTriggerLimit(value: number) {
    // 0x00 ~ 0xFF -> 0 ~ 100
    return Math.round((value / 255) * 100)
  },

  encodeTriggerLimit(value: number) {
    // 0 ~ 100 -> 0x00 ~ 0xFF
    return Math.round((value / 100) * 255)
  },

  getBit(value: number, index: number) {
    return (value >> index) & 1
  },
}

export enum DSEProfileIntensity {
  Off = 'off',
  Weak = 'weak',
  Medium = 'medium',
  Strong = 'strong',
}

const vibrationIntensityMap: Record<DSEProfileIntensity, number> & Record<number, DSEProfileIntensity> = {
  [DSEProfileIntensity.Off]: 0xFF,
  [DSEProfileIntensity.Weak]: 0x03,
  [DSEProfileIntensity.Medium]: 0x02,
  [DSEProfileIntensity.Strong]: 0x00,
  0xFF: DSEProfileIntensity.Off,
  0x03: DSEProfileIntensity.Weak,
  0x02: DSEProfileIntensity.Medium,
  0x00: DSEProfileIntensity.Strong,
}

const triggerEffectIntensityMap: Record<DSEProfileIntensity, number> & Record<number, DSEProfileIntensity> = {
  [DSEProfileIntensity.Off]: 0xFF,
  [DSEProfileIntensity.Weak]: 0x09,
  [DSEProfileIntensity.Medium]: 0x06,
  [DSEProfileIntensity.Strong]: 0x00,
  0xFF: DSEProfileIntensity.Off,
  0x09: DSEProfileIntensity.Weak,
  0x06: DSEProfileIntensity.Medium,
  0x00: DSEProfileIntensity.Strong,
}

function serializeArrayBuffer(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer) as unknown as number[]))
}

function deserializeArrayBuffer(str: string): ArrayBuffer {
  const binaryString = atob(str)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function setBit(value: number, index: number): number {
  return value | (1 << index)
}

function resetBit(value: number, index: number): number {
  return value & ~(1 << index)
}

export class DSEProfile {
  id: number = -1
  uniqueId: ArrayBuffer
  label: string = ''
  assigned: boolean = false
  switchButton: DSEProfileSwitchButton = DSEProfileSwitchButton.Unknown

  triggerDeadzone: DSETriggerProfile = {
    unified: false,
    left: [0, 0],
    right: [0, 0],
  }

  buttonMapping: DSEProfileButton[]

  leftJoystick: DSEJoystickProfile
  rightJoystick: DSEJoystickProfile

  vibrationIntensity: DSEProfileIntensity = DSEProfileIntensity.Strong
  triggerEffectIntensity: DSEProfileIntensity = DSEProfileIntensity.Strong

  updatedAt: number = -1

  get default() {
    return this.switchButton === DSEProfileSwitchButton.Triangle
  }

  rawData: DataView[] = []

  updateTimestamp() {
    const newUpdatedAt = Date.now()
    this.updatedAt = newUpdatedAt
  }

  get bytes() {
    const buffers = Array.from({ length: 3 }).fill(null).map(() => new Uint8Array(64))
    const buffer0 = buffers[0]
    const buffer1 = buffers[1]
    const buffer2 = buffers[2]
    // TODO: 生成逻辑

    // #region Header
    {
      buffer0[0] = buffer1[0] = buffer2[0] = DSEProfileSwitchButtonMap[this.id]
      buffer0[2] = 0x01
      buffer1[1] = 0x01
      buffer2[1] = 0x02
    }
    // #endregion

    // #region Unique ID
    {
      buffer1.set(new Uint8Array(this.uniqueId), 28)
    }
    // #endregion

    // #region Update Timestamp
    {
      const timestampBuffer = timestampToLEBuffer(this.updatedAt)
      buffer2.set(new Uint8Array(timestampBuffer), 34)
    }
    // #endregion

    // #region Trigger
    {
      buffer2[4] = profileUtils.encodeTriggerLimit(this.triggerDeadzone.unified ? this.triggerDeadzone.unified[0] : this.triggerDeadzone.left[0])
      buffer2[5] = profileUtils.encodeTriggerLimit(this.triggerDeadzone.unified ? this.triggerDeadzone.unified[1] : this.triggerDeadzone.left[1])
      buffer2[6] = profileUtils.encodeTriggerLimit(this.triggerDeadzone.unified ? this.triggerDeadzone.unified[0] : this.triggerDeadzone.right[0])
      buffer2[7] = profileUtils.encodeTriggerLimit(this.triggerDeadzone.unified ? this.triggerDeadzone.unified[1] : this.triggerDeadzone.right[1])
      if (this.triggerDeadzone.unified) {
        buffer2[31] = setBit(0, 7)
      }
    }
    // #endregion

    // #region Label
    {
      const labelBuffer = new Uint8Array(80)
      const encodedLabel = utf16LEEncoder.encode(this.label)
      labelBuffer.set(encodedLabel, 0)
      buffer0.set(labelBuffer.subarray(0, 54), 6)
      buffer1.set(labelBuffer.subarray(54, 80), 2)
    }
    // #endregion

    // #region Vibration and Trigger Effect Intensity
    {
      buffer2[8] = vibrationIntensityMap[this.vibrationIntensity]
      buffer2[9] = triggerEffectIntensityMap[this.triggerEffectIntensity]
    }
    // #endregion

    // #region Joystick
    {
      const leftPreset = DSEJoystickCurveMap[this.leftJoystick.preset]
      const rightPreset = DSEJoystickCurveMap[this.rightJoystick.preset]
      buffer2[30] = this.leftJoystick.preset
      buffer2[32] = this.rightJoystick.preset

      buffer1[44] = leftPreset.curveParams.pointCount
      buffer1[53] = rightPreset.curveParams.pointCount

      const leftStart = 45
      for (let i = 0; i < 8; i++) {
        buffer1[leftStart + i] = this.leftJoystick.curvePoints[i]
      }

      const rightStart = 54
      for (let i = 0; i < 6; i++) {
        buffer1[rightStart + i] = this.rightJoystick.curvePoints[i]
      }
      buffer2[2] = this.rightJoystick.curvePoints[6]
      buffer2[3] = this.rightJoystick.curvePoints[7]
    }
    // #endregion

    // // #region Test
    // {
    //   console.log('this.rawData', this.rawData)
    //   if (this.rawData[2]) {
    //     // buffer1 直接复制 rawData[1][44:59]
    //     buffer1.set(new Uint8Array(this.rawData[1].buffer.slice(44, 60)), 44)
    //     // buffer2 rawData[2][2:3]
    //     buffer2.set(new Uint8Array(this.rawData[2].buffer.slice(2, 4)), 2)
    //     // buffer2 rawData[2][8:33]
    //     buffer2.set(new Uint8Array(this.rawData[2].buffer.slice(8, 34)), 8)
    //   }
    // }
    // // #endregion

    fillProfileArrayReportChecksum(buffers)

    return buffers
  }

  constructor(rawData?: DataView[]) {
    if (rawData) {
      if (rawData.length !== 3) {
        throw new Error('Invalid raw data length')
      }

      this.rawData = rawData

      this.id = rawData[0].getUint8(0)

      this.assigned = rawData[0].getUint8(1) !== 16 // 0x10
      this.switchButton = DSEProfileSwitchButtonMap[rawData[0].getUint8(0)] ?? DSEProfileSwitchButton.Unknown

      // #region Unique ID
      {
        this.uniqueId = rawData[1].buffer.slice(28, 44)
      }
      // #endregion

      if (this.assigned) {
        // #region Label
        {
          const labelBuffer = new Uint8Array(80)
          labelBuffer.set(new Uint8Array(rawData[0].buffer, 6, 54), 0)
          labelBuffer.set(new Uint8Array(rawData[1].buffer, 2, 26), 54)
          const decodedLabel = utf16LEDecoder.decode(labelBuffer).replace(/\0/g, '')
          this.label = decodedLabel.trim()
        }
        // #endregion

        // #region Update Timestamp
        {
          this.updatedAt = leBufferToTimestamp(rawData[2].buffer.slice(34, 40))
        }
        // #endregion

        // #region Trigger
        {
          const isUnified = profileUtils.getBit(rawData[2].getUint8(31), 7) === 1

          if (isUnified) {
            this.triggerDeadzone = {
              unified: [
                profileUtils.decodeTriggerLimit(rawData[2].getUint8(4)),
                profileUtils.decodeTriggerLimit(rawData[2].getUint8(5)),
              ],
            }
          }
          else {
            this.triggerDeadzone = {
              unified: false,
              left: [
                profileUtils.decodeTriggerLimit(rawData[2].getUint8(4)),
                profileUtils.decodeTriggerLimit(rawData[2].getUint8(5)),
              ],
              right: [
                profileUtils.decodeTriggerLimit(rawData[2].getUint8(6)),
                profileUtils.decodeTriggerLimit(rawData[2].getUint8(7)),
              ],
            }
          }
        }
        // #endregion

        // #region Vibration and Trigger Effect Intensity
        {
          this.vibrationIntensity = vibrationIntensityMap[rawData[2].getUint8(8)] ?? DSEProfileIntensity.Strong
          this.triggerEffectIntensity = triggerEffectIntensityMap[rawData[2].getUint8(9)] ?? DSEProfileIntensity.Strong
        }
        // #endregion

        // #region Joystick
        const leftJoystickCurvePreset = rawData[2].getUint8(30)
        const rightJoystickCurvePreset = rawData[2].getUint8(32)

        this.leftJoystick = {
          preset: leftJoystickCurvePreset,
          curvePoints: [
            rawData[1].getUint8(45),
            rawData[1].getUint8(46),
            rawData[1].getUint8(47),
            rawData[1].getUint8(48),
            rawData[1].getUint8(49),
            rawData[1].getUint8(50),
            rawData[1].getUint8(51),
            rawData[1].getUint8(52),
          ],
        }

        this.rightJoystick = {
          preset: rightJoystickCurvePreset,
          curvePoints: [
            rawData[1].getUint8(54),
            rawData[1].getUint8(55),
            rawData[1].getUint8(56),
            rawData[1].getUint8(57),
            rawData[1].getUint8(58),
            rawData[1].getUint8(59),
            rawData[2].getUint8(2),
            rawData[2].getUint8(3),
          ],
        }
        // #endregion
      }
    }
  }

  serialize() {
    const finalJSON = {
      id: this.id,
      label: this.label,
      assigned: this.assigned,
      switchButton: this.switchButton,
      triggerDeadzone: this.triggerDeadzone,
      buttonMapping: this.buttonMapping,
      leftJoystick: this.leftJoystick,
      rightJoystick: this.rightJoystick,
      vibrationIntensity: this.vibrationIntensity,
      triggerEffectIntensity: this.triggerEffectIntensity,
      uniqueId: serializeArrayBuffer(this.uniqueId),
      updatedAt: this.updatedAt,
      rawData: this.rawData.map(buffer => serializeArrayBuffer(buffer.buffer)),
    }
    return JSON.stringify(finalJSON)
  }

  static deserialize(jsonString: string) {
    const parsedData = JSON.parse(jsonString)
    const profile = new DSEProfile()
    profile.id = parsedData.id
    profile.label = parsedData.label
    profile.assigned = parsedData.assigned
    profile.switchButton = parsedData.switchButton
    profile.triggerDeadzone = parsedData.triggerDeadzone
    profile.buttonMapping = parsedData.buttonMapping
    profile.leftJoystick = parsedData.leftJoystick
    profile.rightJoystick = parsedData.rightJoystick
    profile.vibrationIntensity = parsedData.vibrationIntensity
    profile.triggerEffectIntensity = parsedData.triggerEffectIntensity
    profile.uniqueId = deserializeArrayBuffer(parsedData.uniqueId)
    profile.updatedAt = parsedData.updatedAt
    profile.rawData = parsedData.rawData.map((buffer: string) => new DataView(deserializeArrayBuffer(buffer)))

    return profile
  }

  clone() {
    const data = this.serialize()
    return DSEProfile.deserialize(data)
  }

  static utils = profileUtils
}

export function useInnerProfile(profile: MaybeRefOrGetter<DSEProfile>) {
  const innerProfile = shallowRef(reactive(toValue(profile).clone()))
  const unsaved = ref(false)
  const device = useDevice()

  watch(() => toValue(profile), () => {
    reset()
  })

  watch(innerProfile, () => {
    unsaved.value = true
  }, { deep: true })

  function reset() {
    innerProfile.value = reactive(toValue(profile).clone())
    nextTick(() => {
      unsaved.value = false
    })
  }

  function save() {
    innerProfile.value.updateTimestamp()
    const bytes = innerProfile.value.bytes
    const id = bytes[0][0]
    sendFeatureReport(device.value, id, bytes[0].buffer.slice(1))
    sendFeatureReport(device.value, id, bytes[1].buffer.slice(1))
    sendFeatureReport(device.value, id, bytes[2].buffer.slice(1))
    const idMap: Record<number, number> = {
      0x60: 0x63,
      0x62: 0x65,
      0x61: 0x64,
    }
    receiveFeatureReport(device.value, idMap[id])
  }

  return {
    innerProfile,
    reset,
    unsaved,
    save,
  }
}
