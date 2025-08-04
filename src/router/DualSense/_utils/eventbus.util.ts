import { useEventBus } from '@/composables/useEventBus'

export const [useEventBusRegister, useEventBusEmit] = useEventBus<{
  'output:set-speaker-volume': [number]
  'output:set-headphone-volume': [number]
  'output:store-speaker-volume': []
  'output:store-headphone-volume': []
  'output:retrieve-speaker-volume': []
  'output:retrieve-headphone-volume': []
}>()
