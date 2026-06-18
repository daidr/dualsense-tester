import type { ShallowRef } from 'vue'
import type { DeviceItemWithRouter } from '@/device-based-router/shared'
import { computed, inject } from 'vue'

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
  // device.value 在断连/切换的瞬间会被置空（store 的 cleanup 同步置空 currentDevice），
  // 而本 computed 可能被新响应式内核同步 eager 重算，必须空值安全，否则会在 cleanup 中途抛错导致界面卡死。
  return computed(() => device.value?.connectionType)
}
