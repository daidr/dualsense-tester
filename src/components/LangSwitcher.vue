<script setup lang="ts">
import { getAvailableLanguages } from '@/utils/lang.util'
import { useI18n } from 'vue-i18n'
import SelectBox from './common/SelectBox.vue'

const i18n = useI18n()

const availableLocales = getAvailableLanguages()
</script>

<template>
  <SelectBox
    v-model="i18n.locale.value" :options="availableLocales.map((locale) => ({
      value: locale,
      label: $t(`locales.${locale}`),
    }))"
  />
</template>

<style scoped lang="scss"></style>
