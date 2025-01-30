import { defineComponent, effectScope, h, type MaybeRefOrGetter, onScopeDispose, type Ref, shallowRef, type VNode } from 'vue'
import InnerToastContainer from './ToastContainer.vue'

export interface ToastInfo {
  _id: string
  _createdAt: number
  content: MaybeRefOrGetter<string | VNode>
  type?: 'info' | 'success' | 'warning' | 'error'
  icon?: MaybeRefOrGetter<string>
  onClose?: () => void
  duration?: number | false
}

let toasts: Ref<ToastInfo[]> | undefined

export function _initToasts() {
  if (toasts)
    return toasts
  effectScope().run(() => {
    toasts = shallowRef([])
    onScopeDispose(() => {
      toasts = undefined
    })
  })
  return toasts!
}

export type CreateToastProps = Omit<ToastInfo, '_id' | '_createdAt'>
export type SugarToastProps = Omit<CreateToastProps, 'type'>
export interface UseToastReturn {
  close: () => void
}

function closeToast(_id: string) {
  if (!toasts)
    return
  toasts.value = toasts.value.filter(t => t._id !== _id)
}

export const ToastContainer = defineComponent(() => {
  return () => {
    const toasts = _initToasts()
    return h(InnerToastContainer, {
      toasts: toasts.value,
      onClose: (toast) => {
        closeToast(toast._id)
      },
    })
  }
})

function randomString(length: number) {
  return Math.random().toString(36).slice(2, 2 + length)
}

function createToast(props: CreateToastProps) {
  if (!toasts)
    return { close: () => { } }
  const randomNonce = randomString(6)
  const _createdAt = Date.now()
  const _id = `toast-${_createdAt}-${randomNonce}`
  const toastInfo = {
    _id,
    _createdAt,
    ...props,
  }
  toasts.value = [toastInfo, ...toasts.value]
  return {
    close: () => {
      closeToast(_id)
    },
  }
}

const toastSugar = {
  info: (props: SugarToastProps) => createToast({ ...props, type: 'info' }),
  success: (props: SugarToastProps) => createToast({ ...props, type: 'success' }),
  warning: (props: SugarToastProps) => createToast({ ...props, type: 'warning' }),
  error: (props: SugarToastProps) => createToast({ ...props, type: 'error' }),
}

export function useToast() {
  return {
    ...toastSugar,
    toasts,
  }
}
