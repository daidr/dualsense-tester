<script setup lang="ts">
import { getAvailableLanguages } from '@/utils/lang.util'
import { useI18n } from 'vue-i18n'
import SelectBox from './common/SelectBox.vue'

const i18n = useI18n()

const availableLocales = getAvailableLanguages()

const crowdinInfo = __CROWDIN_PROGRESS__

function toPercentage(value: number | undefined) {
  if (value === undefined) {
    return ''
  }
  return `${value * 100}%`
}
</script>

<template>
  <SelectBox v-model="i18n.locale.value" :options="availableLocales.map((locale) => ({
    value: locale,
    label: $t(`locales.${locale}`),
  }))">
    <template #default="{ label, value }">
      <div class="flex items-center justify-between gap-2">
        <div class="flex-grow">{{ label }}</div>
        <div v-if="crowdinInfo[value]?.translationProgress !== undefined" class="progress">{{ toPercentage(crowdinInfo[value]?.translationProgress) }}</div>
      </div>
    </template>
  </SelectBox>
</template>

<style scoped lang="scss">
.progress {
  @apply text-xs px-1 rounded-md bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400;
}
</style>
