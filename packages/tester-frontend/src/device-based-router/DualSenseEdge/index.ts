import { type Component, defineAsyncComponent } from 'vue'
import { checkConnectionType, PRODUCT_ID_DUALSENSE, PRODUCT_ID_DUALSENSE_EDGE, USAGE_ID_GD_GAME_PAD, USAGE_PAGE_GENERIC_DESKTOP, VENDOR_ID_SONY } from '../_utils/ds.util'
import { BaseDeviceRouter, type CustomPanelItem, type DeviceItem } from '../shared'

export class DualSenseEdgeRouter extends BaseDeviceRouter {
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
    return defineAsyncComponent(() => import('./views/ConnectPanel.vue'))
  }

  outputPanel(deviceItem: DeviceItem): Component {
    return defineAsyncComponent(() => import('./views/OutputPanel.vue'))
  }

  modelPanel(deviceItem: DeviceItem): Component {
    return defineAsyncComponent(() => import('./views/ModelPanel.vue'))
  }

  widgetPanels(deviceItem: DeviceItem): CustomPanelItem[] | undefined {
    return [
      {
        title: { key: 'profile_panel.title' },
        tag: 'Beta',
        component: defineAsyncComponent(() => import('./views/ProfileWidget.vue')),
      },
    ]
  }
}
