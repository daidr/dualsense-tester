import { useColorMode } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'

export const usePageStore = defineStore('page', () => {
  const { store: currentColorMode, system: systemColorMode } = useColorMode({
    disableTransition: !!document.startViewTransition,
  })

  const isWebHIDSupported = ref(false)

  const colorModeState = computed(() => {
    if (currentColorMode.value === 'auto') {
      return systemColorMode.value
    }
    else {
      return currentColorMode.value
    }
  }, {})

  onMounted(() => {
    isWebHIDSupported.value = 'hid' in navigator
  })

  return {
    currentColorMode,
    systemColorMode,
    colorModeState,
    isWebHIDSupported,
  }
})
