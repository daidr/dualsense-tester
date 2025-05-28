import type { MaybeRefOrGetter } from 'vue'
import { reactive, shallowReactive, shallowRef, toValue, watch } from 'vue'
import { utf16LEDecoder } from '@/utils/decoder.util'
import { isDev } from '@/utils/env.util'
import { utf16LEEncoder } from '@/utils/encoder.util'
import { leBufferToTimestamp, timestampToLEBuffer } from '@/utils/time.util'

export enum DSEProfileSwitchButton {
  Unknown = 0x00,
  Square = 0x60,
  Cross = 0x61,
  Circle = 0x62,
  Triangle = 0x63, // DEFAULT
}

export enum DSEJoystickProfileType {
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

export interface DSEJoyStickProfile {
  type: DSEJoystickProfileType
  // -5 ~ 5
  adjustment: number
  // 0 ~ 30
  deadZone: number
}

export enum DSEProfileButton {
  UP = 0x00,
  LEFT = 0x01,
  DOWN = 0x02,
  RIGHT = 0x03,
  CIRCLE = 0x04,
  CROSS = 0x05,
  SQUARE = 0x06,
  TRIANGLE = 0x07,
  R1 = 0x08,
  R2 = 0x09,
  R3 = 0x0A,
  L1 = 0x0B,
  L2 = 0x0C,
  L3 = 0x0D,
  Options = 0x10,
  Touchpad = 0x11,
}

export enum DSEProfileButtonIndex {
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
  PADDLE_LEFT,
  PADDLE_RIGHT,
  Options,
  Touchpad,
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
    return Math.floor((value / 255) * 100)
  },

  encodeTriggerLimit(value: number) {
    // 0 ~ 100 -> 0x00 ~ 0xFF
    return Math.floor((value / 100) * 255)
  },

  getBit(value: number, index: number) {
    return (value >> index) & 1
  }
}

export enum DSEProfileIntensity {
  Off = 'off',
  Weak = 'weak',
  Medium = 'medium',
  Strong = 'strong',
}

const vibrationIntensityMap: Record<DSEProfileIntensity, number> & Record<number, DSEProfileIntensity> = {
  [DSEProfileIntensity.Off]: 0xff,
  [DSEProfileIntensity.Weak]: 0x03,
  [DSEProfileIntensity.Medium]: 0x02,
  [DSEProfileIntensity.Strong]: 0x00,
  0xff: DSEProfileIntensity.Off,
  0x03: DSEProfileIntensity.Weak,
  0x02: DSEProfileIntensity.Medium,
  0x00: DSEProfileIntensity.Strong,
}

const triggerEffectIntensityMap: Record<DSEProfileIntensity, number> & Record<number, DSEProfileIntensity> = {
  [DSEProfileIntensity.Off]: 0xff,
  [DSEProfileIntensity.Weak]: 0x09,
  [DSEProfileIntensity.Medium]: 0x06,
  [DSEProfileIntensity.Strong]: 0x00,
  0xff: DSEProfileIntensity.Off,
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

  leftJoyStick: DSEJoyStickProfile
  rightJoyStick: DSEJoyStickProfile

  vibrationIntensity: DSEProfileIntensity = DSEProfileIntensity.Strong
  triggerEffectIntensity: DSEProfileIntensity = DSEProfileIntensity.Strong

  updatedAt: number = -1

  get default() {
    return this.switchButton === DSEProfileSwitchButton.Triangle
  }

  rawData: DataView[] = []

  get bytes() {
    const buffers = new Array(3).fill(null).map(() => new Uint8Array(64))
    const buffer0 = buffers[0]
    const buffer1 = buffers[1]
    const buffer2 = buffers[2]
    // TODO: 生成逻辑

    // #region Header
    {
      buffer0[0] = buffer1[0] = buffer2[0] = this.id
      buffer0[2] = 0x01;
      buffer1[1] = 0x01;
      buffer2[1] = 0x02;
    }
    // #endregion

    // #region Unique ID
    {
      buffer1.set(new Uint8Array(this.uniqueId), 28)
    }
    // #endregion

    // #region Update Timestamp
    {
      const newUpdatedAt = Date.now()
      this.updatedAt = newUpdatedAt
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
      //#endregion

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
          } else {
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
      leftJoyStick: this.leftJoyStick,
      rightJoyStick: this.rightJoyStick,
      vibrationIntensity: this.vibrationIntensity,
      triggerEffectIntensity: this.triggerEffectIntensity,
      uniqueId: serializeArrayBuffer(this.uniqueId),
      updatedAt: this.updatedAt,
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
    profile.leftJoyStick = parsedData.leftJoyStick
    profile.rightJoyStick = parsedData.rightJoyStick
    profile.vibrationIntensity = parsedData.vibrationIntensity
    profile.triggerEffectIntensity = parsedData.triggerEffectIntensity
    profile.uniqueId = deserializeArrayBuffer(parsedData.uniqueId)
    profile.updatedAt = parsedData.updatedAt

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

  watch(() => toValue(profile), () => {
    reset()
  })

  function reset() {
    innerProfile.value = reactive(toValue(profile).clone())
  }

  return {
    innerProfile,
    reset,
  }
}
