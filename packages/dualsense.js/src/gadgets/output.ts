/**
 * Controller Output Report
 *
 * Stores information about the output report.
 */
export interface DualSenseOutput {
  /** Whether the microphone LED is on. */
  micLight: boolean
  /** The lightbar color. */
  lightbar: [number, number, number]
  /**
   * The player LEDs.
   * 0 = off
   * 1 = player 1
   * 2 = player 2
   * 3 = player 3
   * 4 = player 4
   * 5 = all
   */
  playerLight: number
  /**
   * The Player LEDs brightness
   * 0 = high
   * 1 = medium
   * 2 = low
   */
  playerLightBrightness: number
  /** The left rumble motor intensity (0-255). */
  motorLeft: number
  /** The right rumble motor intensity (0-255). */
  motorRight: number
  /**
   * The right trigger effect
   *
   * 0 = off
   * 1 = resistance
   * 2 = soft trigger
   * 3 = automatic trigger
   */
  rightTriggerEffect: number
  /**
   * The left trigger effect
   *
   * 0 = off
   * 1 = resistance
   * 2 = soft trigger
   * 3 = automatic trigger
   */
  leftTriggerEffect: number

  rightTriggerEffectData: number[]
  leftTriggerEffectData: number[]
}

/**
 * Default / Initial Output
 * @ignore
 */
export const defaultOutput: DualSenseOutput = {
  micLight: false,
  lightbar: [0, 255, 0],
  playerLight: 1,
  motorLeft: 0,
  motorRight: 0,
  playerLightBrightness: 0,
  rightTriggerEffect: 0,
  leftTriggerEffect: 0,
  rightTriggerEffectData: [],
  leftTriggerEffectData: [],
}
