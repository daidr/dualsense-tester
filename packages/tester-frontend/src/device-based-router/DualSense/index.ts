import { type Component, defineAsyncComponent } from 'vue'
import { BaseDeviceRouter, type CustomPanelItem, type DeviceItem } from '../shared'
import { checkConnectionType, PRODUCT_ID_DUALSENSE, USAGE_ID_GD_GAME_PAD, USAGE_PAGE_GENERIC_DESKTOP, VENDOR_ID_SONY } from '../utils/ds.util'

export class DualSenseRouter extends BaseDeviceRouter {
  name = 'dualsense'
  filters = [
    {
      vendorId: VENDOR_ID_SONY,
      productId: PRODUCT_ID_DUALSENSE,
      usagePage: USAGE_PAGE_GENERIC_DESKTOP,
      usage: USAGE_ID_GD_GAME_PAD,
    },
  ]

  match(device: HIDDevice): boolean {
    if (device.vendorId === VENDOR_ID_SONY && device.productId === PRODUCT_ID_DUALSENSE) {
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

  visualizerPanels(deviceItem: DeviceItem): CustomPanelItem[] {
    return [
      {
        title: {
          key: 'info_panel.title_gyroscope',
        },
        component: defineAsyncComponent(() => import('./views/_visualizerPanel/GyroView.vue')),
      },
      {
        title: {
          key: 'info_panel.title_accelerometer',
        },
        component: defineAsyncComponent(() => import('./views/_visualizerPanel/AccelView.vue')),
      },
    ]
  }
}
