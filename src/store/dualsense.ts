import type { DeviceItemWithRouter } from '@/device-based-router/shared'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, onMounted, onScopeDispose, onUnmounted, ref, shallowRef, watch } from 'vue'
import { RouterManager } from '@/device-based-router'
import { registerRouters } from '@/device-based-router/register-entry'
import { connectionTypeToString, DeviceConnectionType } from '@/device-based-router/shared'
import { requestHIDDevice } from '@/utils/hid.util'
import { hidLogger } from '@/utils/logger.util'
import { track } from '@/utils/umami.util'

// 同一 HIDDevice 的 open/close 串行执行：在同一句柄上并发开关会互相拒绝或让句柄停在错误状态，
// 用一条 per-device 的 Promise 链把它们排队，并各自吞掉异常以免某步失败阻断后续操作。
const deviceOpChains = new WeakMap<HIDDevice, Promise<unknown>>()
function serializeDeviceOp(device: HIDDevice, op: () => Promise<void>): Promise<void> {
  const next = (deviceOpChains.get(device) ?? Promise.resolve()).then(op, op)
  deviceOpChains.set(device, next.catch(() => {}))
  return next
}

async function openDevice(device: HIDDevice): Promise<void> {
  if (!device.opened) {
    await device.open()
  }
}

async function closeDevice(device: HIDDevice): Promise<void> {
  if (device.opened) {
    await device.close()
  }
}

export const useDualSenseStore = defineStore('dualsense', () => {
  const routerManager = new RouterManager()
  registerRouters(routerManager)

  const deviceList = shallowRef<DeviceItemWithRouter[]>([])
  // 以 HIDDevice 为键缓存 wrapper：保证同一物理设备跨多次 updateDeviceList 始终是同一引用，
  // 避免选中设备的 watcher 因 wrapper 引用变化而反复 close/open（设备被遗忘后 GC 自动回收条目）。
  const deviceItemCache = new WeakMap<HIDDevice, DeviceItemWithRouter>()
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

  function inputReportHandlerFactory() {
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
      track('device_changed', {
        productName: value.device.productName,
        connectionType: connectionTypeToString(value.connectionType),
        productId: value.device.productId,
        vendorId: value.device.vendorId,
      })
    }
  })

  // 选中设备的 open/close 生命周期：仅当「被选中的设备实例」真正变化时才拆/装。
  //
  // 关键：不要用 onWatcherCleanup 来关设备。watch 源依赖 deviceList.value，而 updateDeviceList
  // 每次都会重建 deviceList 数组（add-device / connect / disconnect 都会触发）。Vue 在该 effect 因
  // deviceList 变化而失效重跑时，会先执行上一轮注册的 cleanup（关设备 + 清 currentDevice），再重新
  // 求值源；若选中项未变则跳过回调——于是设备被误关却不重开，UI 退回「未连接」。改为在回调里按
  // activeDevice 的实例差异显式拆/装：回调只在选中值真正变化时运行，数组重建但选中项不变时不触发。
  let activeDevice: HIDDevice | undefined
  let activeHandler: ((event: HIDInputReportEvent) => void) | undefined

  function teardownActiveDevice() {
    if (!activeDevice) {
      return
    }
    const device = activeDevice
    if (activeHandler) {
      device.removeEventListener('inputreport', activeHandler)
    }
    activeDevice = undefined
    activeHandler = undefined
    // 只置空 currentDevice 作为「设备就绪」的权威判据：isDeviceReady 随之变 false 并卸载相关面板。
    // 刻意不置空 inputReport / inputReportId —— 可视化/型号面板里有大量 computed 直接解引用
    // inputReport.value.getXxx()，它们在断连/切换瞬间会先于（被退场动画延迟的）卸载而重算一次，
    // 此时若为 undefined 就会抛 "Cannot read properties of undefined"。设备即将关闭、不再推送新帧，
    // 保留上一帧 DataView 读取无副作用，可让这次重算安全拿到陈旧但有效的数据，面板随后正常卸载。
    currentDevice.value = undefined
    profileMode.value = false
    // close 与 open 在同一句柄上串行，避免 open 进行中就 close 造成竞态。
    serializeDeviceOp(device, () => closeDevice(device))
      .catch((error) => {
        hidLogger.error('close device failed', error)
      })
  }

  watch(() => deviceList.value[currentDeviceIndex.value], (item) => {
    const nextDevice = item?.device
    if (activeDevice === nextDevice) {
      // 选中的设备实例没变（deviceList 只是被重建），不做任何拆/装。
      return
    }
    teardownActiveDevice()
    if (!item) {
      return
    }
    const inputReportHandler = inputReportHandlerFactory()
    activeDevice = item.device
    activeHandler = inputReportHandler
    item.device.addEventListener('inputreport', inputReportHandler)
    // 串行化同一句柄上的 open/close（见 serializeDeviceOp），并补 catch：open 被拒时记录日志而非静默卡死。
    serializeDeviceOp(item.device, () => openDevice(item.device))
      .then(() => {
        if (activeDevice === item.device) {
          currentDevice.value = item
        }
      })
      .catch((error) => {
        hidLogger.error('open device failed', error)
      })
  })

  // store 真正销毁时关掉设备。注意：Pinia 的 acceptHMRUpdate 不会停掉旧 scope，故这不覆盖 HMR 热替换。
  onScopeDispose(teardownActiveDevice)

  // updateDeviceList 串行化：connect / disconnect / requestDevice 都会（不 await 地）调用它，且每次都是一段
  // 异步流程。并发执行时较早那次可能后完成、用陈旧快照覆盖 deviceList——例如快速断连/重连时，重连刷新先
  // 写入 [A]，随后断连刷新以 [] 收尾，触发拆卸却不再重开。用「单飞 + 末尾按需重跑」把它们串起来：在途时
  // 再次请求只置脏标记，当前轮结束后重跑一次，保证最终状态反映最新一次 getDevices。
  let updateInFlight: Promise<void> | null = null
  let updateRerunRequested = false

  function updateDeviceList(): Promise<void> {
    if (updateInFlight) {
      updateRerunRequested = true
      return updateInFlight
    }
    updateInFlight = (async () => {
      try {
        do {
          updateRerunRequested = false
          try {
            await runUpdateDeviceList()
          }
          catch (error) {
            // 单轮失败不丢弃待处理的重跑，也不让未 await 的调用方产生未捕获 rejection。
            hidLogger.error('updateDeviceList failed', error)
          }
        } while (updateRerunRequested)
      }
      finally {
        updateInFlight = null
      }
    })()
    return updateInFlight
  }

  async function runUpdateDeviceList() {
    updatingDeviceList.value = true
    try {
      const devices = await navigator.hid.getDevices()
      deviceList.value = (await Promise.all(devices.map(async (device) => {
        // 同一 HIDDevice 复用同一 wrapper：引用稳定让选中设备 watcher 只在「真正切换设备」时才触发，
        // 避免列表每次重建都被误判为设备变化（设备被遗忘后 GC 自动回收缓存条目）。
        const cachedDeviceItem = deviceItemCache.get(device)
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

        const wrapped: DeviceItemWithRouter = {
          ...deviceItem,
          router,
        }
        deviceItemCache.set(device, wrapped)
        return wrapped
      })))
        .filter(item => item !== undefined)
      hidLogger.debug('deviceList', deviceList.value)
      track('device_list_updated', {
        count: deviceList.value.length,
      })
    }
    finally {
      updatingDeviceList.value = false
    }
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
