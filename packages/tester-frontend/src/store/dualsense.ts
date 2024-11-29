import { DualSense, type DualSenseFirmwareInfo, type DualSenseState } from 'dualsense.js'
import { throttle } from 'lodash-es'
import { defineStore } from 'pinia'
import { reactive, readonly, ref, watch } from 'vue'

export const useDualSenseStore = defineStore('dualsense', () => {
  if (!('hid' in window.navigator)) {
    return {
      dualsense: {} as DualSense,
      isConnected: ref(false),
      state: ref({} as DualSenseState),
      output: {} as typeof DualSense.prototype.output,
      firmwareVersion: null,
    }
  }
  const dualsense = new DualSense({
    persistCalibration: true,
  })
  const isConnected = ref(false)
  const firmwareVersion = ref<DualSenseFirmwareInfo | null>(null)
  const state = ref(dualsense.state)
  const output = reactive(dualsense.output)

  watch(output, (newOutput) => {
    dualsense.output = newOutput
  })

  dualsense.addEventListener('connected', ({ detail }) => {
    isConnected.value = true
    dualsense.getFirmwareVersion().then((version) => {
      firmwareVersion.value = version
    })
    umami?.track('connect', { model: detail.model })
  })

  dualsense.addEventListener('disconnected', () => {
    isConnected.value = false
    umami?.track('disconnect')
  })

  const updateState = (detail: DualSenseState) => {
    state.value = { ...detail }
  }

  const throttledUpdateState = throttle(updateState, 10)

  dualsense.addEventListener('state-change', ({ detail }) => {
    throttledUpdateState(detail)
  })

  return {
    dualsense,
    isConnected,
    state: readonly(state),
    output,
    firmwareVersion,
  }
})
