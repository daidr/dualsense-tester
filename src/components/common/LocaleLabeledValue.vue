<script setup lang="ts">
import type { VNode } from 'vue'
import { computedAsync } from '@vueuse/core'
import { Tooltip } from 'floating-vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledValue from './LabeledValue.vue'

const props = defineProps<{
  label: string
  value: string | undefined | Promise<string | undefined>
  valueLocalePrefix?: string
  tooltip?: VNode
  valueClass?: string
}>()

const i18n = useI18n()

const finalLabel = computed(() => {
  return i18n.t(props.label)
})

const loading = ref(false)

const resolvedValue = computedAsync(async () => {
  if (typeof props.value === 'object') {
    const value = await props.value
    return value
  }
  return props.value
}, null, loading)

const finalValue = computed(() => {
  const valueLocalePrefix = props.valueLocalePrefix
  const innerResolvedValue = resolvedValue.value
  if (innerResolvedValue === null) {
    return null
  }
  if (props.valueLocalePrefix) {
    if (!innerResolvedValue) {
      return `${valueLocalePrefix}`
    }
    return `${valueLocalePrefix}.${innerResolvedValue}`
  }
  return innerResolvedValue
})

function normalizeVNode(vNode: VNode | (() => VNode)) {
  return vNode
}
</script>

<template>
  <LabeledValue v-if="finalValue !== null" :label="finalLabel">
    <div v-if="loading || !finalValue" class="h-full w-full flex items-center justify-end">
      <div class="i-mingcute-loading-fill animate-spin" />
    </div>
    <div v-else class="flex items-start justify-end gap-0.5" :class="props.valueClass">
      <span class="inline-block">{{ valueLocalePrefix ? $t(finalValue)
        : finalValue }}
      </span>
      <template v-if="tooltip">
        <Tooltip
          class="inline-block flex pt-3px" :delay="{ show: 0, hide: 100 }" :triggers="['hover', 'focus']"
          :popper-triggers="['hover', 'focus']"
        >
          <div class="i-mingcute-information-fill shrink-0" />
          <template #popper>
            <component :is="normalizeVNode(tooltip)" />
          </template>
        </Tooltip>
      </template>
    </div>
  </LabeledValue>
</template>

<style scoped></style>
