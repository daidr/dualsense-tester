<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  /** 保留在尾部、不参与省略的字符数 */
  tail?: number
}>(), {
  tail: 6,
})

// 头部可被省略（末尾出现省略号），尾部固定完整展示，视觉上即为「中间省略」。
const head = computed(() => (props.tail > 0 ? props.text.slice(0, -props.tail) : props.text))
const tailText = computed(() => (props.tail > 0 ? props.text.slice(-props.tail) : ''))

const headEl = ref<HTMLElement>()
const truncated = ref(false)

function measure() {
  const el = headEl.value
  truncated.value = !!el && el.scrollWidth - el.clientWidth > 1
}

// 容器宽度变化时重新判断是否溢出。
useResizeObserver(headEl, measure)
// 文案变化（如切换语言）后尺寸未必变化，主动重测一次。
watch(() => props.text, () => nextTick(measure))

// 仅在确实发生省略时挂 tooltip，避免无意义的悬浮提示。
const tooltip = computed(() =>
  truncated.value
    ? { content: props.text, placement: 'top' as const, delay: { show: 200, hide: 100 } }
    : '',
)
</script>

<template>
  <span v-tooltip="tooltip" class="middle-ellipsis" :aria-label="text">
    <span ref="headEl" class="head">{{ head }}</span>
    <span v-if="tailText" class="tail">{{ tailText }}</span>
  </span>
</template>

<style scoped lang="scss">
.middle-ellipsis {
  @apply flex min-w-0 items-center;
}

.head {
  @apply min-w-0 overflow-hidden text-ellipsis whitespace-nowrap;
}

.tail {
  @apply shrink-0 whitespace-nowrap;
}
</style>
