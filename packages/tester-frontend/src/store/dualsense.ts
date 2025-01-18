import type { DeviceItem, DualSenseConnectionType, InputInfo } from '@/dualsense/types'
import type { DualSense } from 'dualsense.js'
import { checkConnectionType, getDeviceInfo, getDualSenseType, parseDualSenseInputReport, requestControllerDevice as requestDevice } from '@/dualsense/utils'
import { isObjectShallowEqual } from '@/utils/common.util'
import { computedAsync } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, onMounted, onUnmounted, onWatcherCleanup, reactive, readonly, ref, watch } from 'vue'

export const useDualSenseStore = defineStore('dualsense', () => {
  const rawDeviceList = ref<HIDDevice[]>([])

  const deviceList = computed<DeviceItem[]>(() => {
    return rawDeviceList.value.map(device => ({
      device,
      productName: device.productName,
      connectionType: checkConnectionType(device),
      type: getDualSenseType(device),
    }))
  })

  const _currentDeviceIndex = ref(0)

  const currentDeviceIndex = computed(() => Math.min(_currentDeviceIndex.value, deviceList.value.length - 1))

  // 赋值给 currentDevice 的设备一定是已经打开的
  const currentDevice = ref<DeviceItem | undefined>(undefined)

  const setCurrentDeviceIndex = (index: number) => {
    _currentDeviceIndex.value = index
  }

  const inputReport = ref<DataView | undefined>()
  const inputLabelInfo = ref<InputInfo['labelResult']>()
  const inputVisualInfo = ref<InputInfo['visualResult']>()
  const inputSeqNum = ref(0)

  let currentAnimationFrame: number | undefined

  function inputReportHandlerFactory(deviceItem: DeviceItem) {
    const { connectionType } = deviceItem
    return (event: HIDInputReportEvent) => {
      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame)
      }
      currentAnimationFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputReport.value = event.data
          const result = parseDualSenseInputReport(event.reportId, event.data, connectionType)
          if (result && deviceItem.device === currentDevice.value?.device) {
            inputSeqNum.value = result.seqNum
            inputLabelInfo.value = result.labelResult
            inputVisualInfo.value = result.visualResult
          }
        })
      })
    }
  }

  const deviceInfo = computedAsync(async () => {
    if (!currentDevice.value) {
      return ([])
    }

    const deviceInfo = await getDeviceInfo(currentDevice.value)
    return deviceInfo
  })

  watch(() => deviceList.value[currentDeviceIndex.value], (item) => {
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

  function updateDeviceList() {
    navigator.hid.getDevices().then((devices) => {
      rawDeviceList.value = devices
    })
  }

  function deviceConnectedHandler(event: HIDConnectionEvent) {
    console.log('device connected', event)
    updateDeviceList()
  }

  function deviceDisconnectedHandler(event: HIDConnectionEvent) {
    console.log('device disconnected', event)
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
    const result = await requestDevice()
    if (result) {
      updateDeviceList()
    }
  }

  return {
    deviceList,
    requestControllerDevice,
    currentDeviceIndex,
    setCurrentDeviceIndex,
    currentDevice,
    deviceInfo,
    inputLabelInfo,
    inputVisualInfo,
    inputSeqNum,
    inputReport,
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
