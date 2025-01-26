import type { watch } from 'vue'

export function isObjectShallowEqual(obj1: Record<string, any> | undefined, obj2: Record<string, any> | undefined) {
  if (!obj1 || !obj2) {
    return false
  }
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  return keys1.length === keys2.length && keys1.every(key => obj1[key] === obj2[key])
}
