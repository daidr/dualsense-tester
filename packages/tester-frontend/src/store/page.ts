import { hole } from '@/utils/func.util'
import { useColorMode } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

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

  watch(currentColorMode, () => {
    document.querySelector('meta[name="theme-color"]')!.setAttribute('content', colorModeState.value === 'dark' ? '#000000' : '#ffffff')
  }, { immediate: true })

  return {
    currentColorMode,
    systemColorMode,
    colorModeState,
    isWebHIDSupported,
  }
})
