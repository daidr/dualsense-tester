import { hidLogger } from './logger.util'

export async function requestHIDDevice(filters: HIDDeviceFilter[]): Promise<boolean> {
  try {
    await navigator.hid.requestDevice({
      filters,
    })
  }
  catch (error) {
    hidLogger.error(error)
    return false
  }
  return true
}
