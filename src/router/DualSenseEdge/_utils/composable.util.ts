import { computed } from 'vue'
import { useInputReport } from '@/composables/useInjectValues'

export function useInNormalMode() {
  const inputReport = useInputReport()
  const inNormalMode = computed(() => {
    const byte = inputReport.value?.getInt8(48)
    return byte && (byte & 0b00000011) === 0
  })
  return inNormalMode
}
