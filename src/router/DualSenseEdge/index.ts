import { type Component, defineAsyncComponent } from 'vue'
import { BaseDeviceRouter, type CustomPanelItem, type DeviceItem } from '../../device-based-router/shared'
import { checkConnectionType, PRODUCT_ID_DUALSENSE_EDGE, USAGE_ID_GD_GAME_PAD, USAGE_PAGE_GENERIC_DESKTOP, VENDOR_ID_SONY } from '../../utils/dualsense/ds.util'

const connectPanel = defineAsyncComponent(() => import('./views/ConnectPanel.vue'))
const outputPanel = defineAsyncComponent(() => import('./views/OutputPanel.vue'))
const modelPanel = defineAsyncComponent(() => import('./views/ModelPanel.vue'))
const profileWidget = defineAsyncComponent(() => import('./views/ProfileWidget.vue'))

export default class DualSenseEdgeRouter extends BaseDeviceRouter {
  name = 'dualsense-edge'
  filters = [
    {
      vendorId: VENDOR_ID_SONY,
      productId: PRODUCT_ID_DUALSENSE_EDGE,
      usagePage: USAGE_PAGE_GENERIC_DESKTOP,
      usage: USAGE_ID_GD_GAME_PAD,
    },
  ]

  match(device: HIDDevice): boolean {
    if (device.vendorId === VENDOR_ID_SONY && device.productId === PRODUCT_ID_DUALSENSE_EDGE) {
      return true
    }
    return false
  }

  getDeviceItem(device: HIDDevice): DeviceItem {
    return {
      deviceName: device.productName,
      connectionType: checkConnectionType(device),
      device,
    }
  }

  connectPanel(deviceItem: DeviceItem): Component {
    return connectPanel
  }

  outputPanel(deviceItem: DeviceItem): Component {
    return outputPanel
  }

  modelPanel(deviceItem: DeviceItem): Component {
    return modelPanel
  }

  widgetPanels(deviceItem: DeviceItem): CustomPanelItem[] | undefined {
    return [
      {
        title: { key: 'profile_panel.title' },
        tag: 'WIP',
        component: profileWidget,
      },
    ]
  }
}
