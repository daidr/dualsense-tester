import type { Component } from 'vue'
import type { CustomPanelItem, DeviceItem } from '../../device-based-router/shared'
import { defineAsyncComponent } from 'vue'
import { BaseDeviceRouter } from '../../device-based-router/shared'
import { checkConnectionType, PRODUCT_ID_DUALSENSE_EDGE, USAGE_ID_GD_GAME_PAD, USAGE_PAGE_GENERIC_DESKTOP, VENDOR_ID_SONY } from '../../utils/dualsense/ds.util'

const InputInfoWidget = defineAsyncComponent(() => import('./views/_ConnectPanel/InputInfo.vue'))
const FactoryInfoWidget = defineAsyncComponent(() => import('./views/_ConnectPanel/FactoryInfo.vue'))
const OutputPanel = defineAsyncComponent(() => import('./views/OutputPanel.vue'))
const ModelPanel = defineAsyncComponent(() => import('./views/ModelPanel.vue'))
const ProfileWidget = defineAsyncComponent(() => import('./views/ProfileWidget.vue'))
const GyroView = defineAsyncComponent(() => import('./views/_visualizerPanel/GyroView.vue'))
const AccelView = defineAsyncComponent(() => import('./views/_visualizerPanel/AccelView.vue'))
const AudioWidget = defineAsyncComponent(() => import('./views/AudioControlWidget.vue'))
const HideInConfigModeLayout = defineAsyncComponent(() => import('./views/HideInConfigModeLayout.vue'))

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

  connectWidgetPanels(_deviceItem: DeviceItem) {
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

  modelPanel(_deviceItem: DeviceItem): Component {
    return ModelPanel
  }

  widgetPanels(_deviceItem: DeviceItem): CustomPanelItem[] | undefined {
    return [
      {
        title: {
          key: 'output_panel.title',
        },
        component: OutputPanel,
        layout: HideInConfigModeLayout,
        hideInProfileMode: true,
      },
      {
        title: { key: 'audio_panel.title' },
        component: AudioWidget,
        layout: HideInConfigModeLayout,
        hideInProfileMode: true,
      },
      {
        title: { key: 'profile_panel.title' },
        tag: 'Beta',
        component: ProfileWidget,
      },
    ]
  }

  visualizerPanels(_deviceItem: DeviceItem): CustomPanelItem[] {
    return [
      {
        title: {
          key: 'info_panel.title_gyroscope',
        },
        component: GyroView,
        layout: HideInConfigModeLayout,
        hideInProfileMode: true,
      },
      {
        title: {
          key: 'info_panel.title_accelerometer',
        },
        component: AccelView,
        layout: HideInConfigModeLayout,
        hideInProfileMode: true,
      },
    ]
  }
}
