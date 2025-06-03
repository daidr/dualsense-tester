import type { DeviceItemWithRouter } from '@/device-based-router/shared'
import { RouterManager } from '@/device-based-router'
import { registerRouters } from '@/device-based-router/register-entry'
import { connectionTypeToString, DeviceConnectionType } from '@/device-based-router/shared'
import { gitDefine } from '@/utils/env.util'
import { requestHIDDevice } from '@/utils/hid.util'
import { hidLogger } from '@/utils/logger.util'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'

export const useDualSenseStore = defineStore('dualsense', () => {
  const routerManager = new RouterManager()
  registerRouters(routerManager)

  const deviceList = shallowRef<DeviceItemWithRouter[]>([])
  const updatingDeviceList = ref(false)

  const _currentDeviceIndex = ref(0)

  const currentDeviceIndex = computed(() => Math.min(_currentDeviceIndex.value, deviceList.value.length - 1))

  // 赋值给 currentDevice 的设备一定是已经打开的
  const currentDevice = shallowRef<DeviceItemWithRouter | undefined>(undefined)

  const setCurrentDeviceIndex = (index: number) => {
    _currentDeviceIndex.value = index
  }

  const inputReport = shallowRef<DataView | undefined>()
  const inputReportId = shallowRef<number | undefined>()

  const isDeviceReady = computed(() => {
    return currentDevice.value !== undefined && inputReport.value !== undefined && inputReportId.value !== undefined
  })

  /** Indicates whether the device is in profile configuration mode (only supported by DualSense Edge) */
  const profileMode = ref(false)

  let currentAnimationFrame: number | undefined

  function inputReportHandlerFactory(deviceItem: DeviceItemWithRouter) {
    return (event: HIDInputReportEvent) => {
      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame)
      }
      currentAnimationFrame = requestAnimationFrame(() => {
        inputReport.value = event.data
        inputReportId.value = event.reportId
      })
    }
  }

  // const deviceInfo = computedAsync(async () => {
  //   if (!currentDevice.value) {
  //     return ([])
  //   }

  //   const deviceInfo = await getDeviceInfo(currentDevice.value)
  //   return deviceInfo
  // })

  watch(() => currentDevice.value, (value) => {
    if (value) {
      umami?.track('device_changed', {
        productName: value.device.productName,
        connectionType: connectionTypeToString(value.connectionType),
        productId: value.device.productId,
        vendorId: value.device.vendorId,
        version: gitDefine.shortCommitHash,
      })
    }
  })

  watch(() => deviceList.value[currentDeviceIndex.value], (item, _, onWatcherCleanup) => {
    if (!item) {
      return
    }
    let cleanedUp = false
    const inputReportHandler = inputReportHandlerFactory(item)
    item?.device?.addEventListener('inputreport', inputReportHandler)
    // item.device.oninputreport = inputReportHandler
    item?.device?.open().then(() => {
      if (cleanedUp)
        return

      currentDevice.value = item
    })

    onWatcherCleanup(() => {
      cleanedUp = true
      item.device.close()
      currentDevice.value = undefined
      inputReport.value = undefined
      inputReportId.value = undefined
      profileMode.value = false
      item.device.removeEventListener('inputreport', inputReportHandler)
      // item.device.oninputreport = null
    })
  })

  async function updateDeviceList() {
    updatingDeviceList.value = true
    const devices = await navigator.hid.getDevices()
    deviceList.value = (await Promise.all(devices.map(async (device) => {
      // 尝试使用缓存
      const cachedDeviceItem = deviceList.value.find(item => item.device === device)
      if (cachedDeviceItem) {
        return cachedDeviceItem
      }
      const router = await routerManager.match(device)
      if (!router) {
        hidLogger.warn('No router matched, this device will be ignored', device)
        return undefined
      }

      const deviceItem = await router.getDeviceItem(device)

      if (deviceItem.connectionType === DeviceConnectionType.Unknown) {
        hidLogger.warn('Unknown connection type, this device will be ignored', device)
        return undefined
      }

      return {
        ...deviceItem,
        router,
      }
    })))
      .filter(item => item !== undefined)
    hidLogger.debug('deviceList', deviceList.value)
    updatingDeviceList.value = false
    umami?.track('device_list_updated', {
      count: deviceList.value.length,
      version: gitDefine.shortCommitHash,
    })
  }

  function deviceConnectedHandler(event: HIDConnectionEvent) {
    hidLogger.debug('device connected', event)
    updateDeviceList()
  }

  function deviceDisconnectedHandler(event: HIDConnectionEvent) {
    hidLogger.debug('device disconnected', event)
    updateDeviceList()
  }

  onMounted(() => {
    updateDeviceList()
    navigator.hid.addEventListener('connect', deviceConnectedHandler)
    navigator.hid.addEventListener('disconnect', deviceDisconnectedHandler)
  })

  onUnmounted(() => {
    navigator.hid.removeEventListener('connect', deviceConnectedHandler)
    navigator.hid.removeEventListener('disconnect', deviceDisconnectedHandler)
  })

  async function requestControllerDevice() {
    const result = await requestHIDDevice(routerManager.filters)
    if (result) {
      updateDeviceList()
    }
  }

  const reactiveViews = routerManager.reactiveViews(currentDevice)

  return {
    updatingDeviceList,
    deviceList,
    requestControllerDevice,
    currentDeviceIndex,
    setCurrentDeviceIndex,
    currentDevice,
    inputReport,
    inputReportId,
    views: reactiveViews,
    isDeviceReady,
    profileMode,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDualSenseStore, import.meta.hot))
}
