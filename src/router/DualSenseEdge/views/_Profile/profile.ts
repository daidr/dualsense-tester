import type { MaybeRefOrGetter } from 'vue'
import { nextTick, reactive, ref, shallowRef, toValue, watch } from 'vue'
import { useDevice } from '@/composables/useInjectValues'
import { utf16LEDecoder } from '@/utils/decoder.util'
import { fillProfileArrayReportChecksum } from '@/utils/dualsense/crc32.util'
import { receiveFeatureReport, sendFeatureReport } from '@/utils/dualsense/ds.util'
import { utf16LEEncoder } from '@/utils/encoder.util'
import { leBufferToTimestamp, timestampToLEBuffer } from '@/utils/time.util'

export enum DSEProfileSwitchButton {
  Unknown = 0x00,
  Square = 0x60,
  Cross = 0x61,
  Circle = 0x62,
  Triangle = 0x63, // DEFAULT
}

/**
 * Used in profile removing report
 */
export const DSEProfileSwitchButtonIndexMap = {
  [DSEProfileSwitchButton.Unknown]: 0,
  /**
   * The default profile, I don't know what will happen after deletion
   */
  [DSEProfileSwitchButton.Triangle]: 1,
  [DSEProfileSwitchButton.Square]: 2,
  [DSEProfileSwitchButton.Cross]: 3,
  [DSEProfileSwitchButton.Circle]: 4,
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
  // 自定义
  CUSTOM = 0xFF,
}

export interface DSEJoystickProfile {
  preset: DSEJoystickProfilePreset
  curvePoints: number[]
}

export class DSEJoystickCurvePos {
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

    // const key = `${deadzone}-${currentPointValue}`

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
  [DSEJoystickProfilePreset.CUSTOM]: new DSEJoystickCurve({
    adjustment: false,
    pointCount: 4,
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
}

/**
 * 将曲线第 `pointIndex` 个点(1/2/3,point0 为死区点不在此处理)设为 (x, y),
 * 并施加与拖拽完全一致的钳制:X 限制在 [前一点X, 后一点X](保持单调不减),Y 限制在 [0, 255]。
 * 不修改入参,返回新的曲线数组。拖拽与数值输入共用此函数,确保两种交互行为一致。
 */
export function setCurvePoint(curve: number[], pointIndex: number, x: number, y: number): number[] {
  const newCurve = [...curve]
  const firstPointX = newCurve[0] ?? 0
  const lastPointX = 255
  const prevPointX = newCurve[(pointIndex - 1) * 2] ?? firstPointX
  const nextPointX = newCurve[(pointIndex + 1) * 2] ?? lastPointX
  newCurve[pointIndex * 2] = Math.round(Math.max(prevPointX, Math.min(nextPointX, x)))
  newCurve[pointIndex * 2 + 1] = Math.round(Math.max(0, Math.min(255, y)))
  return newCurve
}

/**
 * 校验并规整一段粘贴进来的曲线数值:必须是 8 个有限数,逐项钳制到 [0, 255] 取整,
 * 并强制 X(下标 0/2/4/6)单调不减。非法输入返回 null。
 */
export function normalizeCurvePoints(values: number[]): number[] | null {
  if (!Array.isArray(values) || values.length !== 8) {
    return null
  }
  if (values.some(v => typeof v !== 'number' || !Number.isFinite(v))) {
    return null
  }
  const clamped = values.map(v => Math.round(Math.max(0, Math.min(255, v))))
  for (let i = 2; i < 8; i += 2) {
    if (clamped[i] < clamped[i - 2]) {
      clamped[i] = clamped[i - 2]
    }
  }
  return clamped
}

// Firmware byte values for each button in the DualSense Edge profile remapping table.
// Source: https://github.com/steffalon/dualsense-edge-profile-web-application/blob/main/src/enum/Button.ts
// Note: the HID input report exposes the d-pad as a hat-switch nibble, but the
// profile remapping table uses its own flat byte index space where d-pad directions
// are addressed as ordinary buttons (0x00–0x03).
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
  // Back paddles are DualSense Edge exclusive. 0x0E / 0x0F are inferred from
  // their position in the 16-entry mapping table; they have no documented target
  // byte value and cannot be used as a remap destination.
  PADDLE_LEFT = 0x0E,
  PADDLE_RIGHT = 0x0F,
  Options = 0x10,
  Touchpad = 0x11,
  // The entries below are not part of the 16-entry profile remap table and have
  // no documented firmware byte values; they exist only for type-level use elsewhere.
  Create = 0x12,
  PS = 0x13,
  TouchpadButton = 0x14,
  LeftJoystick = 0x15,
  RightJoystick = 0x16,
  JOYSTICK_SWITCH = 0x17,
}

// The 16 mapping-table positions (the remappable *source* buttons), in order.
// Position N corresponds to byte N in the profile's button-mapping block; the
// value stored at that byte is the *target* button. By default every button maps
// to itself.
export const DSEProfileMappingButtons = [
  DSEProfileButton.UP,
  DSEProfileButton.LEFT,
  DSEProfileButton.DOWN,
  DSEProfileButton.RIGHT,
  DSEProfileButton.CIRCLE,
  DSEProfileButton.CROSS,
  DSEProfileButton.SQUARE,
  DSEProfileButton.TRIANGLE,
  DSEProfileButton.R1,
  DSEProfileButton.R2,
  DSEProfileButton.R3,
  DSEProfileButton.L1,
  DSEProfileButton.L2,
  DSEProfileButton.L3,
  DSEProfileButton.PADDLE_LEFT,
  DSEProfileButton.PADDLE_RIGHT,
] as const

// The set of button byte values that may legally be stored as a remap *target*.
// This differs from the source positions above: the back paddles are NOT valid
// targets (you cannot make another button behave as a paddle), while Options
// (0x10) and Touchpad (0x11) are. Disabling is tracked separately, see
// DSEProfileDisabledButtonBitMap. Values outside this set are treated as
// unassigned by normalizeProfileButtonMapping and fall back to the source identity.
export const DSEProfileMappingTargets: DSEProfileButton[] = [
  DSEProfileButton.UP,
  DSEProfileButton.LEFT,
  DSEProfileButton.DOWN,
  DSEProfileButton.RIGHT,
  DSEProfileButton.CIRCLE,
  DSEProfileButton.CROSS,
  DSEProfileButton.SQUARE,
  DSEProfileButton.TRIANGLE,
  DSEProfileButton.R1,
  DSEProfileButton.R2,
  DSEProfileButton.R3,
  DSEProfileButton.L1,
  DSEProfileButton.L2,
  DSEProfileButton.L3,
  DSEProfileButton.Options,
  DSEProfileButton.Touchpad,
]

export const DSEProfileButtonLabelMap: Record<number, string> = {
  [DSEProfileButton.UP]: 'UP',
  [DSEProfileButton.LEFT]: 'LEFT',
  [DSEProfileButton.DOWN]: 'DOWN',
  [DSEProfileButton.RIGHT]: 'RIGHT',
  [DSEProfileButton.CIRCLE]: 'CIRCLE',
  [DSEProfileButton.CROSS]: 'CROSS',
  [DSEProfileButton.SQUARE]: 'SQUARE',
  [DSEProfileButton.TRIANGLE]: 'TRIANGLE',
  [DSEProfileButton.R1]: 'R1',
  [DSEProfileButton.R2]: 'R2',
  [DSEProfileButton.R3]: 'R3',
  [DSEProfileButton.L1]: 'L1',
  [DSEProfileButton.L2]: 'L2',
  [DSEProfileButton.L3]: 'L3',
  [DSEProfileButton.PADDLE_LEFT]: 'PADDLE LEFT',
  [DSEProfileButton.PADDLE_RIGHT]: 'PADDLE RIGHT',
  [DSEProfileButton.Options]: 'OPTIONS',
  [DSEProfileButton.Touchpad]: 'TOUCHPAD',
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

// Bit positions inside the profile's `disableButtons` field (a uint32 stored
// little-endian at buffer2 offset 26-29, immediately after the 16-byte
// buttonMapping block). A set bit means that physical control is disabled. The
// factory default is 0x00C00000 (both back paddles disabled out of the box).
//
// Notes:
// - CROSS and CIRCLE have NO disable bit (they are required for system
//   navigation), so they can only be remapped.
// - STICK_LEFT/RIGHT are the analog stick deflections; L3/R3 are the stick
//   clicks (separate bits).
export enum DSEProfileDisabledButtonBitMap {
  UP = 0,
  LEFT = 1,
  DOWN = 2,
  RIGHT = 3,
  CREATE = 4,
  OPTIONS = 5,
  SQUARE = 6,
  TRIANGLE = 7,
  STICK_LEFT = 8,
  STICK_RIGHT = 9,
  PS = 10,
  TOUCHPAD = 13,
  TOUCHPAD_BUTTON = 14,
  R1 = 16,
  R2 = 17,
  R3 = 18,
  L1 = 19,
  L2 = 20,
  L3 = 21,
  PADDLE_LEFT = 22,
  PADDLE_RIGHT = 23,
  ENABLE_STICK_SWAPPING = 31,
}

// For each of the 16 remap *source* buttons (DSEProfileMappingButtons order),
// the disableButtons bit that disables it — or undefined when the button cannot
// be disabled. CROSS and CIRCLE have no disable bit (see above), so their remap
// picker must not offer a "disabled" choice.
export const DSEProfileMappingButtonDisableBit: Record<number, DSEProfileDisabledButtonBitMap | undefined> = {
  [DSEProfileButton.UP]: DSEProfileDisabledButtonBitMap.UP,
  [DSEProfileButton.LEFT]: DSEProfileDisabledButtonBitMap.LEFT,
  [DSEProfileButton.DOWN]: DSEProfileDisabledButtonBitMap.DOWN,
  [DSEProfileButton.RIGHT]: DSEProfileDisabledButtonBitMap.RIGHT,
  [DSEProfileButton.CIRCLE]: undefined,
  [DSEProfileButton.CROSS]: undefined,
  [DSEProfileButton.SQUARE]: DSEProfileDisabledButtonBitMap.SQUARE,
  [DSEProfileButton.TRIANGLE]: DSEProfileDisabledButtonBitMap.TRIANGLE,
  [DSEProfileButton.R1]: DSEProfileDisabledButtonBitMap.R1,
  [DSEProfileButton.R2]: DSEProfileDisabledButtonBitMap.R2,
  [DSEProfileButton.R3]: DSEProfileDisabledButtonBitMap.R3,
  [DSEProfileButton.L1]: DSEProfileDisabledButtonBitMap.L1,
  [DSEProfileButton.L2]: DSEProfileDisabledButtonBitMap.L2,
  [DSEProfileButton.L3]: DSEProfileDisabledButtonBitMap.L3,
  [DSEProfileButton.PADDLE_LEFT]: DSEProfileDisabledButtonBitMap.PADDLE_LEFT,
  [DSEProfileButton.PADDLE_RIGHT]: DSEProfileDisabledButtonBitMap.PADDLE_RIGHT,
}

// Factory default for the disableButtons field: both back paddles disabled.
export const DSE_PROFILE_DEFAULT_DISABLE_BUTTONS = (1 << DSEProfileDisabledButtonBitMap.PADDLE_LEFT)
  | (1 << DSEProfileDisabledButtonBitMap.PADDLE_RIGHT)

export function isProfileButtonDisabled(disableButtons: number, bit: DSEProfileDisabledButtonBitMap): boolean {
  return ((disableButtons >>> bit) & 1) === 1
}

export function setProfileButtonDisabled(disableButtons: number, bit: DSEProfileDisabledButtonBitMap, disabled: boolean): number {
  const mask = 1 << bit
  return (disabled ? (disableButtons | mask) : (disableButtons & ~mask)) >>> 0
}

// Matches the NUL padding in the fixed-width UTF-16 label buffer.
// oxlint-disable-next-line no-control-regex
const PROFILE_LABEL_NULL_REGEX = /\0/g

const PROFILE_BUTTON_MAPPING_OFFSET = 10
const PROFILE_BUTTON_MAPPING_LENGTH = 16
// The disableButtons uint32 (little-endian) sits right after the 16-byte mapping.
const PROFILE_DISABLE_BUTTONS_OFFSET = PROFILE_BUTTON_MAPPING_OFFSET + PROFILE_BUTTON_MAPPING_LENGTH

function getDefaultProfileButtonMapping(): DSEProfileButton[] {
  return [...DSEProfileMappingButtons]
}

export function normalizeProfileButtonMapping(mapping: number[] | DSEProfileButton[] | undefined): DSEProfileButton[] {
  if (!Array.isArray(mapping) || mapping.length !== PROFILE_BUTTON_MAPPING_LENGTH) {
    return getDefaultProfileButtonMapping()
  }

  return mapping.map((value, index) => {
    if (DSEProfileMappingTargets.includes(value as DSEProfileButton)) {
      return value as DSEProfileButton
    }
    return DSEProfileMappingButtons[index]
  })
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

export class DSEProfile {
  id: number = -1
  uniqueId: ArrayBuffer
  label: string
  assigned: boolean
  switchButton: DSEProfileSwitchButton

  triggerDeadzone: DSETriggerProfile

  buttonMapping: DSEProfileButton[]
  // uint32 bitmap of disabled controls; bit positions are DSEProfileDisabledButtonBitMap.
  disableButtons: number

  leftJoystick: DSEJoystickProfile
  rightJoystick: DSEJoystickProfile

  vibrationIntensity: DSEProfileIntensity
  triggerEffectIntensity: DSEProfileIntensity

  updatedAt: number

  get default() {
    return this.switchButton === DSEProfileSwitchButton.Triangle
  }

  constructor(params?: {
    id?: number
    uniqueId?: ArrayBuffer
    label?: string
    assigned?: boolean
    switchButton?: DSEProfileSwitchButton
    triggerDeadzone?: DSETriggerProfile
    buttonMapping?: DSEProfileButton[]
    disableButtons?: number
    leftJoystick?: DSEJoystickProfile
    rightJoystick?: DSEJoystickProfile
    vibrationIntensity?: DSEProfileIntensity
    triggerEffectIntensity?: DSEProfileIntensity
    updatedAt?: number
  }) {
    const {
      id = -1,
      uniqueId = new ArrayBuffer(16),
      label = '',
      assigned = false,
      switchButton = DSEProfileSwitchButton.Unknown,
      triggerDeadzone = {
        unified: false,
        left: [0, 100],
        right: [0, 100],
      },
      buttonMapping = getDefaultProfileButtonMapping(),
      disableButtons = DSE_PROFILE_DEFAULT_DISABLE_BUTTONS,
      leftJoystick = {
        preset: DSEJoystickProfilePreset.DEFAULT,
        curvePoints: [0, 0, 128, 128, 196, 196, 225, 225],
      },
      rightJoystick = {
        preset: DSEJoystickProfilePreset.DEFAULT,
        curvePoints: [0, 0, 128, 128, 196, 196, 225, 225],
      },
      vibrationIntensity = DSEProfileIntensity.Strong,
      triggerEffectIntensity = DSEProfileIntensity.Strong,
      updatedAt = -1,
    } = params || {}

    this.id = id
    this.uniqueId = uniqueId
    this.label = label
    this.assigned = assigned
    this.switchButton = switchButton
    this.triggerDeadzone = triggerDeadzone
    this.buttonMapping = normalizeProfileButtonMapping(buttonMapping)
    this.disableButtons = disableButtons >>> 0
    this.leftJoystick = leftJoystick
    this.rightJoystick = rightJoystick
    this.vibrationIntensity = vibrationIntensity
    this.triggerEffectIntensity = triggerEffectIntensity
    this.updatedAt = updatedAt
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

    // #region Button mapping & disabled buttons
    {
      const normalizedMapping = normalizeProfileButtonMapping(this.buttonMapping)
      buffer2.set(normalizedMapping, PROFILE_BUTTON_MAPPING_OFFSET)
      // disableButtons: uint32 little-endian right after the 16-byte mapping.
      new DataView(buffer2.buffer).setUint32(PROFILE_DISABLE_BUTTONS_OFFSET, this.disableButtons >>> 0, true)
    }
    // #endregion

    fillProfileArrayReportChecksum(buffers)

    return buffers
  }

  public static fromData(rawData: DataView[]) {
    if (rawData.length !== 3) {
      throw new Error('Invalid raw data length')
    }

    const newInstance = new DSEProfile()

    newInstance.rawData = rawData

    newInstance.id = rawData[0].getUint8(0)

    newInstance.assigned = rawData[0].getUint8(1) !== 16 // 0x10
    newInstance.switchButton = DSEProfileSwitchButtonMap[rawData[0].getUint8(0)] ?? DSEProfileSwitchButton.Unknown

    // #region Unique ID
    {
      newInstance.uniqueId = rawData[1].buffer.slice(28, 44)
    }
    // #endregion

    if (newInstance.assigned) {
      // #region Label
      {
        const labelBuffer = new Uint8Array(80)
        labelBuffer.set(new Uint8Array(rawData[0].buffer, 6, 54), 0)
        labelBuffer.set(new Uint8Array(rawData[1].buffer, 2, 26), 54)
        const decodedLabel = utf16LEDecoder.decode(labelBuffer).replace(PROFILE_LABEL_NULL_REGEX, '')
        newInstance.label = decodedLabel.trim()
      }
      // #endregion

      // #region Update Timestamp
      {
        newInstance.updatedAt = leBufferToTimestamp(rawData[2].buffer.slice(34, 40))
      }
      // #endregion

      // #region Trigger
      {
        const isUnified = profileUtils.getBit(rawData[2].getUint8(31), 7) === 1

        if (isUnified) {
          newInstance.triggerDeadzone = {
            unified: [
              profileUtils.decodeTriggerLimit(rawData[2].getUint8(4)),
              profileUtils.decodeTriggerLimit(rawData[2].getUint8(5)),
            ],
          }
        }
        else {
          newInstance.triggerDeadzone = {
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
        newInstance.vibrationIntensity = vibrationIntensityMap[rawData[2].getUint8(8)] ?? DSEProfileIntensity.Strong
        newInstance.triggerEffectIntensity = triggerEffectIntensityMap[rawData[2].getUint8(9)] ?? DSEProfileIntensity.Strong
      }
      // #endregion

      // #region Joystick
      const leftJoystickCurvePreset = rawData[2].getUint8(30)
      const rightJoystickCurvePreset = rawData[2].getUint8(32)

      newInstance.leftJoystick = {
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

      newInstance.rightJoystick = {
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

    newInstance.buttonMapping = normalizeProfileButtonMapping(
      Array.from(new Uint8Array(rawData[2].buffer.slice(PROFILE_BUTTON_MAPPING_OFFSET, PROFILE_BUTTON_MAPPING_OFFSET + PROFILE_BUTTON_MAPPING_LENGTH))),
    )
    newInstance.disableButtons = rawData[2].getUint32(PROFILE_DISABLE_BUTTONS_OFFSET, true)

    return newInstance
  }

  serialize() {
    const finalJSON = {
      id: this.id,
      label: this.label,
      assigned: this.assigned,
      switchButton: this.switchButton,
      triggerDeadzone: this.triggerDeadzone,
      buttonMapping: this.buttonMapping,
      disableButtons: this.disableButtons,
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
    profile.buttonMapping = normalizeProfileButtonMapping(parsedData.buttonMapping)
    profile.disableButtons = (parsedData.disableButtons ?? DSE_PROFILE_DEFAULT_DISABLE_BUTTONS) >>> 0
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

export function useSaveProfile() {
  const device = useDevice()
  return {
    save: async (profile: DSEProfile) => {
      profile.updateTimestamp()
      const bytes = profile.bytes
      const id = bytes[0][0]
      await sendFeatureReport(device.value, id, bytes[0].buffer.slice(1))
      await sendFeatureReport(device.value, id, bytes[1].buffer.slice(1))
      await sendFeatureReport(device.value, id, bytes[2].buffer.slice(1))
      const idMap: Record<number, number> = {
        0x60: 0x63,
        0x62: 0x65,
        0x61: 0x64,
      }
      await receiveFeatureReport(device.value, idMap[id])
    },
  }
}

export function useInnerProfile(profile: MaybeRefOrGetter<DSEProfile>) {
  const innerProfile = shallowRef(reactive(toValue(profile).clone()))
  const unsaved = ref(false)
  const { save: saveProfile } = useSaveProfile()

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

  async function save() {
    await saveProfile(innerProfile.value)
    unsaved.value = false
  }

  return {
    innerProfile,
    reset,
    unsaved,
    save,
  }
}
