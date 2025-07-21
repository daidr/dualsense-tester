import type { Component } from 'vue'
import type { CustomPanelItem, DeviceItem } from '../../device-based-router/shared'
import { defineAsyncComponent } from 'vue'
import { BaseDeviceRouter } from '../../device-based-router/shared'
import { checkConnectionTypeDS4, PRODUCT_ID_DUALSHOCK_V1, PRODUCT_ID_DUALSHOCK_V2, USAGE_ID_GD_GAME_PAD, USAGE_PAGE_GENERIC_DESKTOP, VENDOR_ID_SONY } from '../../utils/dualsense/ds.util'

const InputInfoWidget = defineAsyncComponent(() => import('./views/_ConnectPanel/InputInfo.vue'))
const FactoryInfoWidget = defineAsyncComponent(() => import('./views/_ConnectPanel/FactoryInfo.vue'))
const OutputPanel = defineAsyncComponent(() => import('./views/OutputPanel.vue'))
const ModelPanel = defineAsyncComponent(() => import('./views/ModelPanel.vue'))
const GyroView = defineAsyncComponent(() => import('./views/_visualizerPanel/GyroView.vue'))
const AccelView = defineAsyncComponent(() => import('./views/_visualizerPanel/AccelView.vue'))
// const AudioWidget = defineAsyncComponent(() => import('./views/AudioControlWidget.vue'))

export default class DualSenseRouter extends BaseDeviceRouter {
  name = 'dualshock-v2'
  filters = [
    {
      vendorId: VENDOR_ID_SONY,
      productId: PRODUCT_ID_DUALSHOCK_V2,
      usagePage: USAGE_PAGE_GENERIC_DESKTOP,
      usage: USAGE_ID_GD_GAME_PAD,
    },
    {
      vendorId: VENDOR_ID_SONY,
      productId: PRODUCT_ID_DUALSHOCK_V1,
      usagePage: USAGE_PAGE_GENERIC_DESKTOP,
      usage: USAGE_ID_GD_GAME_PAD,
    },
  ]

  match(device: HIDDevice): boolean {
    if (device.vendorId === VENDOR_ID_SONY && [PRODUCT_ID_DUALSHOCK_V2, PRODUCT_ID_DUALSHOCK_V1].includes(device.productId)) {
      return true
    }
    return false
  }

  getDeviceItem(device: HIDDevice): DeviceItem {
    return {
      deviceName: device.productName,
      connectionType: checkConnectionTypeDS4(device),
      device,
    }
  }

  connectWidgetPanels(deviceItem: DeviceItem) {
    return [
      {
        component: InputInfoWidget,
      },
      {
        title: {
          key: 'connect_panel.factory_info_title',
        },
        fold: true,
        component: FactoryInfoWidget,
      },
    ]
  }

  modelPanel(deviceItem: DeviceItem): Component {
    return ModelPanel
  }

  widgetPanels(deviceItem: DeviceItem): CustomPanelItem[] | undefined {
    return [
      {
        title: {
          key: 'output_panel.title',
        },
        component: OutputPanel,
      },
    ]
  }

  visualizerPanels(deviceItem: DeviceItem): CustomPanelItem[] {
    return [
      {
        title: {
          key: 'info_panel.title_gyroscope',
        },
        component: GyroView,
        btAllowedReportIds: [0x11],
      },
      {
        title: {
          key: 'info_panel.title_accelerometer',
        },
        component: AccelView,
        btAllowedReportIds: [0x11],
      },
    ]
  }
}
