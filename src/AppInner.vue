<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { provide, readonly } from 'vue'
import ConditionShell from './components/common/ConditionShell.vue'
import WidgetShell from './components/common/WidgetShell.vue'
import ConnectPanel from './components/ConnectPanel.vue'
import DebugPanel from './components/DebugPanel.vue'
import VisualPanel from './components/VisualPanel.vue'
import { useDualSenseStore } from './store/dualsense'
import { isDev } from './utils/env.util'

const dsStore = useDualSenseStore()
const { inputReport, inputReportId, currentDevice } = storeToRefs(dsStore)

provide('inputReport', readonly(inputReport))
provide('inputReportId', readonly(inputReportId))
provide('deviceItem', readonly(currentDevice))

// const { MagicTeleportView } = useMagicTeleport('profileLayout')
</script>

<template>
  <div class="flex flex-grow flex-col gap-3 lg:grid lg:grid-cols-[400px_1fr]">
    <div class="flex flex-col items-start gap-3">
      <ConnectPanel />
      <template v-if="dsStore.isDeviceReady && dsStore.views.widgetPanels?.length">
        <ConditionShell :shell="WidgetShell" :widgets="dsStore.views.widgetPanels" />
      </template>
      <!-- <ProfilePanel v-if="dualsenseStore.currentDevice?.type === DualSenseType.DualSenseEdge" /> -->
      <DebugPanel v-if="dsStore.isDeviceReady && isDev" />
    </div>
    <div class="dou-sc-container flex-grow" id="main-content"></div>
    <Teleport to="#main-content" defer>
      <VisualPanel v-if="!dsStore.profileMode" />
    </Teleport>
  </div>
</template>

<style scoped></style>
