import { computed, ref } from 'vue'

export function refWithHandler<T>(value: T, handler?: (value: T) => void) {
  const refValue = ref(value)
  return computed({
    get() {
      return refValue.value
    },
    set(value) {
      refValue.value = value
      handler?.(value)
    },
  })
}
