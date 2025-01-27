<script setup lang="ts">
import type { CustomPanelItem } from '@/device-based-router/shared'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GeneralContainer from './GeneralContainer.vue'

const props = defineProps<{
  item: CustomPanelItem
}>()

const { t } = useI18n()

const finalTitle = computed(() => {
  if (!props.item.title)
    return ''
  return typeof props.item.title === 'string' ? props.item.title : t(props.item.title.key)
})

const finalTag = computed(() => {
  if (!props.item.tag)
    return ''
  return typeof props.item.tag === 'string' ? props.item.tag : t(props.item.tag.key)
})
</script>

<template>
  <GeneralContainer :title="finalTitle" :tag="finalTag">
    <component :is="item.component" />
  </GeneralContainer>
</template>

<style scoped></style>
