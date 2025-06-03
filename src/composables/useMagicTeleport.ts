import { defineComponent, onScopeDispose,  shallowReactive, type ShallowReactive, type VNode } from "vue"

interface MagicTeleportItem {
    refCount: number
    vNode: VNode | VNode[] | null
}

const magicTeleportStore = new Map<string, ShallowReactive<MagicTeleportItem>>()

export function useMagicTeleport(name: string) {
    function useTeleportItem() {
        let item = magicTeleportStore.get(name)
        if (item) {
            item.refCount++
        } else {
            item = shallowReactive({ refCount: 1, vNode: null })
            magicTeleportStore.set(name, item)
        }
        onScopeDispose(() => {
            item.refCount--
            if (item.refCount <= 0) {
                magicTeleportStore.delete(name)
            }
        })
        return item;
    }

    return {
        /**
         * The target element to teleport to.
         */
        MagicTeleportView: defineComponent(() => {
            const item = useTeleportItem()
            return () => {
                if (item.vNode) {
                    return item.vNode
                }
                return null
            }
        }),
        /**
         * The teleport component to use.
         */
        MagicTeleport: defineComponent((_, ctx) => {
            const item = useTeleportItem()

            return () => {
                item.vNode = ctx.slots.default ? ctx.slots.default() : null
                return null
            }
        })
    }
}
