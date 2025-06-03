import { computed } from 'vue'
import { useConnectionType, useInputReport } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'

export function useInNormalMode() {
  const inputReport = useInputReport()
  const connectionType = useConnectionType()
  const inNormalMode = computed(() => {
    const byte = inputReport.value?.getInt8(connectionType.value === DeviceConnectionType.USB ? 48 : 49)
    return byte && (byte & 0b00000011) === 0
  })
  return inNormalMode
}
