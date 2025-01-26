import type { DualSense } from 'dualsense.js'
import { RouterManager } from '@/device-based-router'
import { DualSenseRouter } from '@/device-based-router/DualSense'
import { DualSenseEdgeRouter } from '@/device-based-router/DualSenseEdge'
import { DeviceConnectionType, type DeviceItemWithRouter } from '@/device-based-router/shared'
import { type DeviceItem, type DSEProfileItem, type DualSenseConnectionType, DualSenseType, type InputInfo } from '@/dualsense/types'
import { checkConnectionType, getDeviceInfo, getDualSenseType, parseDualSenseInputReport, requestControllerDevice as requestDevice } from '@/dualsense/utils'
import { isObjectShallowEqual } from '@/utils/common.util'
import { requestHIDDevice } from '@/utils/hid.util'
import { hidLogger } from '@/utils/logger.util'
import { computedAsync } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, onMounted, onUnmounted, onWatcherCleanup, reactive, readonly, ref, shallowRef, watch } from 'vue'

export const useDualSenseStore = defineStore('dualsense', () => {
  const routerManager = new RouterManager()
  routerManager.register(new DualSenseRouter())
  routerManager.register(new DualSenseEdgeRouter())

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
  const inputLabelInfo = shallowRef<InputInfo['labelResult']>()
  const inputVisualInfo = shallowRef<InputInfo['visualResult']>()
  const inputSeqNum = ref(0)

  const isDeviceReady = computed(() => {
    return currentDevice.value !== undefined && inputReport.value !== undefined
  })

  let currentAnimationFrame: number | undefined

  function inputReportHandlerFactory(deviceItem: DeviceItemWithRouter) {
    return (event: HIDInputReportEvent) => {
      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame)
      }
      currentAnimationFrame = requestAnimationFrame(() => {
        inputReport.value = event.data
        // const result = parseDualSenseInputReport(event.reportId, event.data, connectionType)
        // if (result && deviceItem.device === currentDevice.value?.device) {
        //   inputSeqNum.value = result.seqNum
        //   inputLabelInfo.value = result.labelResult
        //   inputVisualInfo.value = result.visualResult
        // }
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

  watch(() => deviceList.value[currentDeviceIndex.value], (item, prevItem) => {
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
      currentDevice.value = undefined
      inputLabelInfo.value = undefined
      inputVisualInfo.value = undefined
      inputReport.value = undefined
      inputSeqNum.value = 0
      item?.device?.removeEventListener('inputreport', inputReportHandler)
      // item.device.oninputreport = null
      item?.device?.close()
    })
  })

  async function updateDeviceList() {
    updatingDeviceList.value = true
    const devices = await navigator.hid.getDevices()
    deviceList.value = (await Promise.all(devices.map(async (device) => {
      // // 尝试使用缓存
      // const cachedDeviceItem = deviceList.value.find(item => item.device === device)
      // if (cachedDeviceItem) {
      //   return cachedDeviceItem
      // }
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
    updatingDeviceList.value = false
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

  const views = computed(() => {
    return routerManager.views(currentDevice.value)
  })

  return {
    updatingDeviceList,
    deviceList,
    requestControllerDevice,
    currentDeviceIndex,
    setCurrentDeviceIndex,
    currentDevice,
    // deviceInfo,
    // inputLabelInfo,
    // inputVisualInfo,
    // inputSeqNum,
    inputReport,
    views,
    isDeviceReady,
    // old
    // dualsense: {} as DualSense,
    // isConnected: ref(false),
    // state: ref({} as DualSenseState),
    // output: {} as typeof DualSense.prototype.output,
  }

  // // const dualsense = new DualSense({
  // //   persistCalibration: true,
  // // })
  // const dualsense = {}
  // const isConnected = ref(false)
  // const firmwareVersion = ref<DualSenseFirmwareInfo | null>(null)
  // const state = ref(dualsense.state)
  // const output = reactive(dualsense.output)

  // watch(output, (newOutput) => {
  //   dualsense.output = newOutput
  // })

  // dualsense.addEventListener('connected', ({ detail }) => {
  //   isConnected.value = true
  //   dualsense.getFirmwareVersion().then((version) => {
  //     firmwareVersion.value = version
  //   })
  //   umami?.track('connect', { model: detail.model })
  // })

  // dualsense.addEventListener('disconnected', () => {
  //   isConnected.value = false
  //   umami?.track('disconnect')
  // })

  // const updateState = (detail: DualSenseState) => {
  //   state.value = { ...detail }
  // }

  // const throttledUpdateState = throttle(updateState, 10)

  // dualsense.addEventListener('state-change', ({ detail }) => {
  //   throttledUpdateState(detail)
  // })

  // return {
  //   dualsense,
  //   isConnected,
  //   state: readonly(state),
  //   output,
  //   firmwareVersion,
  // }
})
