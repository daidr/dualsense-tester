<script setup lang="ts" generic="Comp extends Component<{
    item: CustomPanelItem
}>"
>
import type { Component, ExtractPropTypes } from 'vue'
import type { CustomPanelItem } from '@/device-based-router/shared'
import { useConnectionType, useInputReportId } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { useDualSenseStore } from '@/store/dualsense'

defineProps<{
  shell: Comp
  widgets: CustomPanelItem[]
  shellProps?: Omit<ExtractPropTypes<Comp>, 'item'>
}>()

const reportId = useInputReportId()
const connectionType = useConnectionType()
const dsStore = useDualSenseStore()

function isReportAllowed(item: CustomPanelItem) {
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

function isProfileAllowed(item: CustomPanelItem) {
  if (item.hideInProfileMode && dsStore.profileMode) {
    return false
  }
  return true
}
</script>

<template>
  <template v-for="(item, index) of widgets" :key="index">
    <component :is="shell" v-if="isReportAllowed(item) && isProfileAllowed(item)" :item="item" v-bind="shellProps" />
  </template>
</template>

<style scoped></style>
