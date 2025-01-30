import { type Component, defineComponent, effectScope, h, type MaybeRef, onScopeDispose, type Ref, shallowRef, type VNode } from 'vue'
import InnerModalContainer from './ModalContainer.vue'

export interface ModalInfo {
  _id: string
  _createdAt: number
  title?: MaybeRef<string> | VNode
  content?: MaybeRef<string> | VNode
  icon?: Component | string
  confirmText?: MaybeRef<string>
  cancelText?: MaybeRef<string>
  onConfirm?: () => void
  onCancel?: () => void
  onClose?: () => void
  hideConfirm?: MaybeRef<boolean>
  hideCancel?: MaybeRef<boolean>
}

let modals: Ref<ModalInfo[]> | undefined

export function _initModal() {
  if (modals)
    return modals
  effectScope().run(() => {
    modals = shallowRef([])
    onScopeDispose(() => {
      modals = undefined
    })
  })
  return modals!
}

export type UseModalProps = Omit<ModalInfo, '_id' | '_createdAt'>
export interface UseModalReturn {
  close: () => void
}

function closeModal(_id: string) {
  if (!modals)
    return
  modals.value = modals.value.filter(m => m._id !== _id)
}

export const ModalContainer = defineComponent(() => {
  return () => {
    const modals = _initModal()
    return h(InnerModalContainer, {
      modals: modals.value,
      onCancel: (modal) => {
        modal.onCancel?.()
        closeModal(modal._id)
      },
      onConfirm: (modal) => {
        modal.onConfirm?.()
        closeModal(modal._id)
      },
    })
  }
})

function randomString(length: number) {
  return Math.random().toString(36).slice(2, 2 + length)
}

export function useModal(props: UseModalProps) {
  if (!modals)
    return { close: () => {} }
  const randomNonce = randomString(6)
  const _createdAt = Date.now()
  const _id = `modal-${_createdAt}-${randomNonce}`
  const modalInfo = {
    _id,
    _createdAt,
    ...props,
  }
  modals.value = [...modals.value, modalInfo]
  return {
    close: () => {
      closeModal(_id)
    },
  }
}
