import { defineStore } from 'pinia'
import { DualSense } from 'dualsense.js'
import { ref } from 'vue'

export const useDualSense = defineStore('dualsense', () => {
  const dualsense = new DualSense({
    persistCalibration: true
  })

  const isConnected = ref(false)
  const state = ref(dualsense.state)

  dualsense.addEventListener('connected', () => {
    isConnected.value = true
  })

  dualsense.addEventListener('disconnected', () => {
    isConnected.value = false
  })

  dualsense.addEventListener('state-change', ({ detail }) => {
    state.value = detail
  })

  return {
    dualsense,
    isConnected
  }
})
