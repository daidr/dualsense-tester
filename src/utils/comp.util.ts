import { defineComponent, h, isVNode, type MaybeRefOrGetter, toValue, type VNode } from 'vue'

export const RenderComponent = defineComponent((props: { node: MaybeRefOrGetter<string | VNode>, className?: string, textClassName?: string }) => {
  return () => {
    if (isVNode(props.node)) {
      return props.node
    }
    else {
      const result = toValue(props.node)
      if (typeof result === 'string') {
        return h('span', {
          class: props.textClassName,
        }, result)
      }
      else {
        return h(result, {
          class: props.className,
        })
      }
    }
  }
}, {
  props: ['node', 'className', 'textClassName'],
})
