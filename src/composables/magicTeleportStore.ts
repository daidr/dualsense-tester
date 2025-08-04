import type { ShallowReactive, ShallowRef, VNode } from 'vue'

interface MagicTeleportItem {
  refCount: number
  vNode: VNode | VNode[] | null
  triggerRef: ShallowRef<number>
}

export const _magicTeleportStore = new Map<string, ShallowReactive<MagicTeleportItem>>()
