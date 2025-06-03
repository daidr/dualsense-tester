<script setup lang="ts">
import { getLangSpecFont } from '@/composables/useLangSpecFont'
import { getLocaleLabel } from '@/locales'
import { usePageStore } from '@/store/page'
import { getAvailableLanguages } from '@/utils/lang.util'
import DouSelect from './base/DouSelect.vue'

const pageStore = usePageStore()

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
  <DouSelect
    v-model="pageStore.locale" :options="availableLocales.map((locale) => ({
      value: locale,
      label: getLocaleLabel(locale),
    }))"
  >
    <template #default="{ label, value }">
      <div
        class="flex items-center justify-between gap-2"
      >
        <div
          class="flex-grow" :style="{
            fontFamily: getLangSpecFont(value),
          }"
        >
          {{ label }}
        </div>
        <div v-if="crowdinInfo[value]?.translationProgress !== undefined" class="progress">
          {{ toPercentage(crowdinInfo[value]?.translationProgress) }}
        </div>
      </div>
    </template>
  </DouSelect>
</template>

<style scoped lang="scss">
.progress {
  @apply text-xs px-1 rounded-md bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400;
}
</style>
