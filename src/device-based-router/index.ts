import type { ShallowRef } from 'vue'
import type { BaseDeviceRouter, DeviceItemWithRouter } from './shared'
import { shallowReactiveComputed } from '@/utils/reactive.util'
import { reactiveComputed } from '@vueuse/core'

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

  reactiveViews(deviceItemRef: ShallowRef<DeviceItemWithRouter | undefined>) {
    return shallowReactiveComputed(() => {
      return {
        connectPanel: deviceItemRef.value?.router.connectPanel(deviceItemRef.value),
        outputPanel: deviceItemRef.value?.router.outputPanel(deviceItemRef.value),
        modelPanel: deviceItemRef.value?.router.modelPanel(deviceItemRef.value),
        visualizerPanels: deviceItemRef.value?.router.visualizerPanels?.(deviceItemRef.value),
        widgetPanels: deviceItemRef.value?.router.widgetPanels?.(deviceItemRef.value),
      }
    })
  }
}
