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

/**
 * 面板内的子组件项，用于一个面板注册多个组件并以 tab 形式切换。
 * A sub-widget inside a panel, used when a panel registers multiple components switched via tabs.
 */
export interface PanelTabItem {
  title: string | { key: string }
  component: Component
  layout?: Component
}

export interface CustomPanelItem {
  title?: string | { key: string }
  tag?: string | { key: string }
  cableAllowedReportIds?: number[]
  btAllowedReportIds?: number[]
  /**
   * 单组件面板使用 component；多组件 tab 面板使用 tabs。两者二选一，提供 tabs 时标题区会渲染为 tab 切换栏。
   * Use `component` for a single-component panel, or `tabs` for a multi-component tabbed panel. When `tabs` is provided, the title area renders a tab switcher.
   */
  component?: Component
  tabs?: PanelTabItem[]
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
