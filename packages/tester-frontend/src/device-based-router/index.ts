import type { Component } from 'vue'
import type { BaseDeviceRouter, CustomPanelItem, DeviceItemWithRouter } from './shared'

export class RouterManager {
  private routers: BaseDeviceRouter[] = []
  private aggregatedFilters: HIDDeviceFilter[] = []

  register(router: BaseDeviceRouter) {
    this.routers.push(router)
    this.aggregatedFilters.push(...router.filters)
  }

  get filters() {
    return this.aggregatedFilters
  }

  async match(device: HIDDevice) {
    for (const router of this.routers) {
      if (await router.match(device)) {
        return router
      }
    }
    return undefined
  }

  views(deviceItem?: DeviceItemWithRouter) {
    return {
      get connectPanel(): Component | undefined {
        if (!deviceItem) {
          return undefined
        }
        return deviceItem.router.connectPanel(deviceItem)
      },
      get outputPanel(): Component | undefined {
        if (!deviceItem) {
          return undefined
        }
        return deviceItem.router.outputPanel(deviceItem)
      },
      get modelPanel(): Component | undefined {
        if (!deviceItem) {
          return undefined
        }
        return deviceItem.router.modelPanel(deviceItem)
      },
      get visualizerPanels(): CustomPanelItem[] | undefined {
        if (!deviceItem) {
          return undefined
        }
        return deviceItem.router.visualizerPanels?.(deviceItem)
      },
      get widgetPanels(): CustomPanelItem[] | undefined {
        if (!deviceItem) {
          return undefined
        }
        return deviceItem.router.widgetPanels?.(deviceItem)
      },
    }
  }
}
