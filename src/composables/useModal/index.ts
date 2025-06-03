import type { Component, MaybeRef, Ref, VNode } from 'vue'
import { defineComponent, effectScope, h, onScopeDispose, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import InnerModalContainer from './ModalContainer.vue'

export interface ModalInfo {
  _id: string
  _createdAt: number
  title?: MaybeRef<string> | VNode | (() => VNode)
  content?: MaybeRef<string> | VNode | (() => VNode)
  icon?: Component | string
  confirmText?: MaybeRef<string>
  cancelText?: MaybeRef<string>
  onConfirm?: () => void | boolean | Promise<void | boolean>
  onCancel?: () => void | boolean | Promise<void | boolean>
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
      onCancel: async (modal) => {
        const close = await modal.onCancel?.()
        if (close === false) {
          return
        }
        closeModal(modal._id)
      },
      onConfirm: async (modal) => {
        const close = await modal.onConfirm?.()
        if (close === false) {
          return
        }
        closeModal(modal._id)
      },
    })
  }
})

function randomString(length: number) {
  return Math.random().toString(36).slice(2, 2 + length)
}

export function useModal() {
  const ids = [] as string[]
  onScopeDispose(() => {
    ids.forEach(id => closeModal(id))
  })

  return {
    open: (props: UseModalProps) => {
      if (!modals) {
        return { close: () => { } }
      }
      const randomNonce = randomString(6)
      const _createdAt = Date.now()
      const _id = `modal-${_createdAt}-${randomNonce}`
      const modalInfo = {
        _id,
        _createdAt,
        ...props,
      }
      modals.value = [...modals.value, modalInfo]
      ids.push(_id)

      return {
        close: () => {
          closeModal(_id)
        },
      }
    },
  }
}

export function useWarningModal() {
  const { open } = useModal()
  const { t } = useI18n()
  return {
    open: (props: Omit<UseModalProps, 'icon' | 'title'>) => {
      return open({
        ...props,
        icon: 'i-mingcute-alert-fill',
        title: t('shared.warning'),
      })
    },
  }
}
