import type { DeviceItemWithRouter } from '@/device-based-router/shared'
import { computed, inject, type ShallowRef } from 'vue'

export function useInputReport() {
  const inputReport = inject<ShallowRef<DataView>>('inputReport')!
  return inputReport
}

export function useInputReportId() {
  const inputReportId = inject<ShallowRef<number>>('inputReportId')!
  return inputReportId
}

export function useDevice() {
  const device = inject<ShallowRef<DeviceItemWithRouter>>('deviceItem')!
  return device
}

export function useConnectionType() {
  const device = useDevice()
  return computed(() => device.value.connectionType)
}
