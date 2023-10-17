import {
  PRODUCT_ID_DUAL_SENSE,
  VENDOR_ID_SONY,
} from "../constants";

export const isDualSense = (device: HIDDevice) => {
  return (
    device.vendorId === VENDOR_ID_SONY &&
    device.productId === PRODUCT_ID_DUAL_SENSE
  );
};

// Normalize an 8-bit thumbstick axis to the range [-1, +1].
export const normalizeThumbStickAxis = (value: number) => {
  return (2 * value) / 0xff - 1.0;
};

// Normalize an 8-bit trigger axis to the range [0, +1].
export const normalizeTriggerAxis = (value: number) => {
  return value / 0xff;
};

// Normalize a digital button value to boolean.
export const normalizeButton = (value: boolean | number) => {
  return !!value;
};
