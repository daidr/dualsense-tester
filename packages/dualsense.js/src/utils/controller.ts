import { DualSenseModel } from '@/types/model'
import {
  PRODUCT_ID_DUALSENSE,
  PRODUCT_ID_DUALSENSE_EDGE,
  VENDOR_ID_SONY,
} from '../constants'

export function isDualSense(device: HIDDevice) {
  return (
    device.vendorId === VENDOR_ID_SONY
    && device.productId === PRODUCT_ID_DUALSENSE
  )
}

export function isDualSenseEdge(device: HIDDevice) {
  return (
    device.vendorId === VENDOR_ID_SONY
    && device.productId === PRODUCT_ID_DUALSENSE_EDGE
  )
}

export function isDualSenseCompatible(device: HIDDevice) {
  return isDualSense(device) || isDualSenseEdge(device)
}

export function getDualSenseModel(device: HIDDevice) {
  if (isDualSense(device)) {
    return DualSenseModel.DualSense
  }
  if (isDualSenseEdge(device)) {
    return DualSenseModel.DualSenseEdge
  }
  return null
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
