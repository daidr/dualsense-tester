import { checkRTL } from '@/utils/direction.util'
import { useColorMode } from '@vueuse/core'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

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

  const i18n = useI18n()

  const locale = computed({
    get() {
      return i18n.locale.value
    },
    set(val: string) {
      i18n.locale.value = val
    },
  })

  watch(locale, (value) => {
    document.documentElement.lang = value
  }, {
    immediate: true,
  })

  const direction = computed<'ltr' | 'rtl'>(() => {
    if (checkRTL(locale.value)) {
      return 'rtl'
    }
    return 'ltr'
  })

  watch(direction, (value) => {
    document.documentElement.dir = value
  }, {
    immediate: true,
  })

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
    direction,
    locale,
  }
})

export function useIsRTL() {
  return computed(() => usePageStore().direction === 'rtl')
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePageStore, import.meta.hot))
}
