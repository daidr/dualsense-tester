<script setup lang="ts">
import { computed, ref } from 'vue';
import LabeledValue from './LabeledValue.vue';
import { useI18n } from 'vue-i18n';
import { computedAsync } from '@vueuse/core';

const props = defineProps<{
  label: string
  value: string | undefined | Promise<string | undefined>
  valueLocalePrefix?: string
}>()

const i18n = useI18n()

const finalLabel = computed(() => {
  return i18n.t(props.label)
})

function test(str: string) {
  console.log('test')
  return i18n.t(str)
}

const loading = ref(false)

const resolvedValue = computedAsync(async () => {
  if (typeof props.value === 'object') {
    const value = await props.value
    return value
  }
  return props.value
}, null, loading)

const finalValue = computed(() => {
  if (resolvedValue.value === null) {
    return null
  }
  if (props.valueLocalePrefix) {
    return `${props.valueLocalePrefix}.${resolvedValue.value}`
  }
  return resolvedValue.value
})
</script>

<template>
  <LabeledValue v-if="finalValue !== null" :label="finalLabel">
    <div v-if="loading || !finalValue" class="w-full h-full flex items-center justify-end">
      <div class="i-mingcute-loading-fill animate-spin"></div>
    </div>
    <span class="w-full" v-else>{{ valueLocalePrefix ? $t(finalValue) : finalValue }}</span>
  </LabeledValue>
</template>

<style scoped></style>
