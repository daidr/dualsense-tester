import type { Component } from 'vue'

export enum DeviceConnectionType {
  USB = 'usb',
  Bluetooth = 'bluetooth',
  Unknown = 'unknown',
}

export function connectionTypeToString(type: DeviceConnectionType): string {
  switch (type) {
    case DeviceConnectionType.USB:
      return 'USB'
    case DeviceConnectionType.Bluetooth:
      return 'Bluetooth'
    case DeviceConnectionType.Unknown:
      return 'Unknown'
  }
}

export interface DeviceItem {
  deviceName: string
  connectionType: DeviceConnectionType
  device: HIDDevice
}

export interface CustomPanelItem {
  title?: string | { key: string }
  tag?: string | { key: string }
  cableAllowedReportIds?: number[]
  btAllowedReportIds?: number[]
  component: Component
  layout?: Component
  hideInProfileMode?: boolean
}

export interface CustomConnectWidgetPanelItem {
  title?: string | { key: string }
  fold?: boolean
  component: Component
}

export interface DeviceItemWithRouter extends DeviceItem {
  router: BaseDeviceRouter
}

/**
 * BaseDeviceRouter 是无状态的，对于相同的传入参数，它总是返回相同的结果。
 * BaseDeviceRouter is stateless, it always returns the same result for the same input parameters.
 */
export abstract class BaseDeviceRouter {
  /**
   * Router 标识符，设备无关
   * Router identifier, device-independent
   */
  abstract name: string
  /**
   * 设备过滤器，用于匹配设备
   * Device filters for matching devices
   */
  abstract filters: HIDDeviceFilter[]
  /**
   * 设备是否与当前路由匹配，路由管理器按照注册顺序调用 match 方法，直到返回 true 为止。
   * Whether the device matches the current route, the router manager calls the match method in the order of registration until it returns true.
   */
  abstract match(device: HIDDevice): Promise<boolean> | boolean
  /**
   * 获取设备信息
   * Get device information
   */
  abstract getDeviceItem(device: HIDDevice): Promise<DeviceItem> | DeviceItem
  abstract connectWidgetPanels?(deviceItem: DeviceItem): CustomConnectWidgetPanelItem[] | undefined
  abstract modelPanel(deviceItem: DeviceItem): Component<ModelProps>
  visualizerPanels?(deviceItem: DeviceItem): CustomPanelItem[] | undefined
  widgetPanels?(deviceItem: DeviceItem): CustomPanelItem[] | undefined
}

export interface ModelProps {
  showValue: boolean
}
