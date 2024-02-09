import { defineStore } from 'pinia'
import { DualSense, type DualSenseState } from 'dualsense.js'
import { reactive, readonly, ref, watch } from 'vue'

// 节流函数
function throttle(fn: Function, delay: number) {
  let timer: number | null = null
  return function (this: any, ...args: any[]) {
    if (timer) {
      return
    }
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

export const useDualSenseStore = defineStore('dualsense', () => {
  if(!window.navigator.hid) {
    return {
      dualsense: null,
      isConnected: ref(false),
      state: ref(null),
      output: null
    }
  }
  const dualsense = new DualSense({
    persistCalibration: true
  })
  const isConnected = ref(false)
  const state = ref(dualsense.state)
  const output = reactive(dualsense.output)

  watch(output, (newOutput) => {
    dualsense.output = newOutput
  })

  dualsense.addEventListener('connected', () => {
    isConnected.value = true
  })

  dualsense.addEventListener('disconnected', () => {
    isConnected.value = false
  })

  const updateState = (detail: DualSenseState) => {
    state.value = {...detail}
  }

  const throttledUpdateState = throttle(updateState, 10)

  dualsense.addEventListener('state-change', ({ detail }) => {
    throttledUpdateState(detail)
  })

  return {
    dualsense,
    isConnected,
    state: readonly(state),
    output
  }
})
