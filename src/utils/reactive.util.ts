import { computed, isRef, type MaybeRef, ref, type Ref, type ShallowReactive, shallowReactive, type ShallowRef, unref, type UnwrapNestedRefs } from 'vue'

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

export function fastGetRef<T extends Ref>(value: T): T['value'] {
  return (value as any)._rawValue
}

export function toShallowReactive<T extends object>(
  objectRef: MaybeRef<T>,
): ShallowReactive<T> {
  if (!isRef(objectRef)) {
    return shallowReactive(objectRef)
  }

  const proxy = new Proxy({}, {
    get(_, p, receiver) {
      return unref(Reflect.get(objectRef.value, p, receiver))
    },
    set(_, p, value) {
      if (isRef((objectRef.value as any)[p]) && !isRef(value)) {
        (objectRef.value as any)[p].value = value
      }
      else {
        (objectRef.value as any)[p] = value
      }
      return true
    },
    deleteProperty(_, p) {
      return Reflect.deleteProperty(objectRef.value, p)
    },
    has(_, p) {
      return Reflect.has(objectRef.value, p)
    },
    ownKeys() {
      return Object.keys(objectRef.value)
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      }
    },
  })

  return shallowReactive(proxy) as ShallowReactive<T>
}

export function shallowReactiveComputed<T extends object>(fn: () => T): ShallowReactive<T> {
  return toShallowReactive(computed(fn))
}
