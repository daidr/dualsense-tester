<script setup lang="ts">
import ConnectPanel from './components/ConnectPanel.vue';
import VisualPanel from './components/VisualPanel.vue';
import { useDualSenseStore } from './store/dualsense';
import OutputPanel from './components/OutputPanel.vue';
import DebugPanel from './components/DebugPanel.vue';
import ProfilePanel from './components/panels/ProfilePanel/ProfilePanel.vue';
import { DualSenseType } from './dualsense/types';
import WidgetShell from './components/common/WidgetShell.vue';
import { provide, readonly } from 'vue';
import { storeToRefs } from 'pinia';
import GeneralContainer from './components/common/GeneralContainer.vue';
const dsStore = useDualSenseStore()
const { inputReport, currentDevice } = storeToRefs(dsStore)

const isDev = import.meta.env.DEV

provide('inputReport', readonly(inputReport))
provide('deviceItem', readonly(currentDevice))
</script>

<template>
  <div class="flex flex-col lg:grid lg:grid-cols-[400px_1fr] gap-3 flex-grow">
    <div class="flex flex-col gap-3 items-start">
      <ConnectPanel />
      <GeneralContainer v-if="dsStore.isDeviceReady && dsStore.views.outputPanel" :title="$t('output_panel.title')">
        <component :is="dsStore.views.outputPanel" />
      </GeneralContainer>
      <template v-if="dsStore.isDeviceReady && dsStore.views.widgetPanels?.length">
        <WidgetShell :item="widget" v-for="widget, index of dsStore.views.widgetPanels" :key="index" />
      </template>
      <!-- <ProfilePanel v-if="dualsenseStore.currentDevice?.type === DualSenseType.DualSenseEdge" /> -->
      <!-- <OutputPanel v-if="dualsenseStore.isConnected" /> -->
      <DebugPanel v-if="dsStore.isDeviceReady && isDev" />
    </div>
    <div class="dou-sc-container">
      <VisualPanel />
    </div>
  </div>
</template>

<style scoped></style>
