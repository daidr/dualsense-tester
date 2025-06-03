<script setup lang="ts">
import type { CustomPanelItem } from '@/device-based-router/shared'
import TextTag from './TextTag.vue'
import { m } from 'motion-v';

defineProps<{
  item: CustomPanelItem
  showValue: boolean
}>()
</script>

<template>
  <m.div layout="position" class="w-full overflow-hidden">
    <h1 v-if="item.title" class="dou-sc-subtitle text-center">
      {{ typeof item.title === 'string' ? item.title
        : $t(item.title.key) }}
      <TextTag v-if="item.tag" class="align-middle text-xs">
        {{ typeof item.tag === 'string' ? item.tag : $t(item.tag.key) }}
      </TextTag>
    </h1>
    <component :is="item.layout" v-if="item.layout">
      <component :is="item.component" :show-value="showValue" />
    </component>
    <component :is="item.component" v-else :show-value="showValue" />
  </m.div>
</template>

<style scoped></style>
