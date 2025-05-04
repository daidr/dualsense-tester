<script setup lang="ts" generic="Comp extends Component<{
    item: CustomPanelItem
}>"
>
import type { Component, ExtractPropTypes } from 'vue'
import { useConnectionType, useInputReportId } from '@/composables/useInjectValues'
import { type CustomPanelItem, DeviceConnectionType } from '@/device-based-router/shared'

defineProps<{
  shell: Comp
  widgets: CustomPanelItem[]
  shellProps: Omit<ExtractPropTypes<Comp>, 'item'>
}>()

const reportId = useInputReportId()
const connectionType = useConnectionType()

function isVisible(item: CustomPanelItem) {
  if (connectionType.value === DeviceConnectionType.USB) {
    if (!item.cableAllowedReportIds) {
      return true
    }
    return item.cableAllowedReportIds.includes(reportId.value)
  }
  if (connectionType.value === DeviceConnectionType.Bluetooth) {
    if (!item.btAllowedReportIds) {
      return true
    }
    return item.btAllowedReportIds.includes(reportId.value)
  }
  return false
}
</script>

<template>
  <template v-for="(item, index) of widgets" :key="index">
    <shell v-if="isVisible(item)" :item="item" v-bind="shellProps" />
  </template>
</template>

<style scoped></style>
