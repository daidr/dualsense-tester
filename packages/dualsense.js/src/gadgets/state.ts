/**
 * Controller State
 *
 * Stores information about the current controller state, and its components.
 */
export interface DualSenseState {
  /** Interface used for communication (USB/Bluetooth) */
  interface: DualSenseInterface;

  /** Battery status */
  battery: DualSenseBatteryStatus;

  /** Analog positions */
  axes: DualSenseAnalogState;
  /** Buttons pressed */
  buttons: DualSenseButtonState;
  /** Touchpad */
  touchpad: DualSenseTouchpad;

  /** Timestamp of the last report */
  timestamp: number;
}

/**
 * Button State
 *
 * Stores information about the buttons that are currently being held.
 */
export interface DualSenseButtonState {
  /** Triangle Button */
  triangle: boolean;
  /** Circle Button */
  circle: boolean;
  /** Cross Button */
  cross: boolean;
  /** Square Button */
  square: boolean;

  /** D-Pad Up */
  dPadUp: boolean;
  /** D-Pad Right */
  dPadRight: boolean;
  /** D-Pad Down */
  dPadDown: boolean;
  /** D-Pad Left */
  dPadLeft: boolean;

  /** L1 Button */
  l1: boolean;
  /** L2 Trigger (non-analog value) */
  l2: boolean;
  /** L3 Button */
  l3: boolean;

  /** R1 Button */
  r1: boolean;
  /** R2 Trigger (non-analog value) */
  r2: boolean;
  /** R3 Button */
  r3: boolean;

  /** Options Button */
  options: boolean;
  /** Create Button */
  create: boolean;
  /** PS Button */
  playStation: boolean;

  /** Touchpad Button */
  touchPadClick: boolean;

  /** Mute Button */
  mute: boolean;
}

/**
 * Analog State
 *
 * Stores information for analog axes.
 *
 * - Values for thumbsticks are stored using the range **-1.0** (left, top) to **1.0** (right, bottom).
 *
 * - Values for triggers use the range **0.0** (released) to **1.0** (pressed)
 *
 * - Values for accelerometer and gyroscope use the raw input from the sensors.
 */
export interface DualSenseAnalogState {
  /** Left Stick Horizontal position. */
  leftStickX: number;
  /** Left Stick Vertical position. */
  leftStickY: number;

  /** Right Stick Horizontal position. */
  rightStickX: number;
  /** Right Stick Vertical position. */
  rightStickY: number;

  /** Left trigger analog value */
  l2: number;
  /** Right trigger analog value */
  r2: number;

  /** Accelerometer Pitch */
  accelPitch: number;
  /** Accelerometer Yaw */
  accelYaw: number;
  /** Accelerometer Roll */
  accelRoll: number;

  /** Angular velocity Pitch */
  gyroPitch: number;
  /** Angular velocity Yaw */
  gyroYaw: number;
  /** Angular velocity Roll */
  gyroRoll: number;

  rawGyroPitch: number;
  rawGyroYaw: number;
  rawGyroRoll: number;
}

/** Touchpad State */
export interface DualSenseTouchpad {
  /** Current touches */
  touches: DualSenseTouchpadTouch[];
}

/**
 * Touchpad Touch Information
 *
 * The touchpad's resolution is 1920x1080.
 */
export interface DualSenseTouchpadTouch {
  /** Touch ID. Changes with every new touch. */
  touchId: number;
  /** X Position. */
  x: number;
  /** Y Position. */
  y: number;
}

/**
 * Current Interface
 */
export enum DualSenseInterface {
  Disconnected = "none",
  /** The controller is connected over USB */
  USB = "usb",
  /** The controller is connected over Bluetooth */
  Bluetooth = "bt",
}

/**
 * Battery Status
 */
export interface DualSenseBatteryStatus {
  full: boolean;
  charging: boolean;
  level: number;
}

/**
 * Default / Initial State
 * @ignore
 */
export const defaultState: DualSenseState = {
  interface: DualSenseInterface.Disconnected,
  battery: {
    full: false,
    charging: false,
    level: 0,
  },

  axes: {
    leftStickX: 0,
    leftStickY: 0,
    rightStickX: 0,
    rightStickY: 0,

    l2: 0,
    r2: 0,

    accelPitch: 0,
    accelYaw: 0,
    accelRoll: 0,

    gyroPitch: 0,
    gyroYaw: 0,
    gyroRoll: 0,

    rawGyroPitch: 0,
    rawGyroYaw: 0,
    rawGyroRoll: 0,
  },

  buttons: {
    triangle: false,
    circle: false,
    cross: false,
    square: false,

    dPadUp: false,
    dPadRight: false,
    dPadDown: false,
    dPadLeft: false,

    l1: false,
    l2: false,
    l3: false,

    r1: false,
    r2: false,
    r3: false,

    options: false,
    create: false,
    mute: false,
    playStation: false,
    touchPadClick: false,
  },

  touchpad: {
    touches: [],
  },

  timestamp: -1,
};
