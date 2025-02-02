<script setup lang="ts">
import type { CustomPanelItem } from '@/device-based-router/shared'
import TextTag from './TextTag.vue'

defineProps<{
  item: CustomPanelItem
  showValue: boolean
}>()
</script>

<template>
  <div class="w-full overflow-hidden">
    <h1 v-if="item.title" class="dou-sc-subtitle text-center">
      {{ typeof item.title === 'string' ? item.title
        : $t(item.title.key) }}
      <TextTag v-if="item.tag" class="align-middle text-xs">
        {{ typeof item.tag === 'string' ? item.tag : $t(item.tag.key) }}
      </TextTag>
    </h1>
    <component :is="item.component" :show-value="showValue" />
  </div>
</template>

<style scoped></style>
