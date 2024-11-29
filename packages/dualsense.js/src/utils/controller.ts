import {
  PRODUCT_ID_DUALSENSE,
  VENDOR_ID_SONY,
} from '../constants'

export function isDualSense(device: HIDDevice) {
  return (
    device.vendorId === VENDOR_ID_SONY
    && device.productId === PRODUCT_ID_DUALSENSE
  )
}

// Normalize an 8-bit thumbStick axis to the range [-1, +1].
export function normalizeThumbStickAxis(value: number) {
  return (2 * value) / 0xFF - 1.0
}

// Normalize an 8-bit trigger axis to the range [0, +1].
export function normalizeTriggerAxis(value: number) {
  return value / 0xFF
}

// Normalize a digital button value to boolean.
export function normalizeButton(value: boolean | number) {
  return !!value
}
