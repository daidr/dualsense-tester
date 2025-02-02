<script setup lang="ts">
import ContentTips from '@/components/common/ContentTips.vue'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { useDualSenseStore } from '@/store/dualsense'
import { gitDefine } from '@/utils/env.util'

import { computed } from 'vue'
import ConnectWidgetShell from './common/ConnectWidgetShell.vue'
// import LoadingView from './common/LoadingView.vue'
import SelectBox from './common/SelectBox.vue'

const dsStore = useDualSenseStore()

function onConnectBtnClick() {
  dsStore.requestControllerDevice()
  umami?.track('connect_button_click', {
    version: gitDefine.shortCommitHash,
  })
}

const deviceList = computed(() => {
  return dsStore.deviceList.map((item, i) => ({
    value: i,
    label: item.deviceName,
    extra: {
      deviceName: item.deviceName,
      connectionType: item.connectionType,
    },
  }))
})
</script>

<template>
  <div class="w-full self-start space-y-2 dou-sc-container">
    <ContentTips v-if="!deviceList.length">
      <p v-html="$t('connect_panel.tips')" />
    </ContentTips>
    <SelectBox
      v-if="deviceList.length" :options="deviceList" :model-value="dsStore.currentDeviceIndex"
      @update:model-value="dsStore.setCurrentDeviceIndex"
    >
      <template #default="{ index, extra }">
        <div class="min-w-0 flex items-center gap-1 py-0.5 text-base">
          <div class="rounded bg-black/10 px-1 text-xs text-black/70 font-mono dark-bg-white/20 dark-text-white/70">
            #{{
              index + 1 }}/{{ deviceList.length }}
          </div>
          <div class="ml-1 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" :title="extra!.deviceName">
            {{
              extra!.deviceName }}
          </div>
          <div v-if="extra!.connectionType === DeviceConnectionType.Bluetooth" class="i-mingcute-bluetooth-line" />
          <div v-else class="i-mingcute-usb-line" />
        </div>
      </template>
    </SelectBox>
    <template v-if="dsStore.views.connectWidgetPanels?.length">
      <div class="flex flex-col gap-y-2">
        <template v-if="dsStore.isDeviceReady">
          <ConnectWidgetShell v-for="widget, index of dsStore.views.connectWidgetPanels" :key="index" :item="widget" />
        </template>
        <!-- <template v-else>
          <LoadingView
            v-for="widget, index of dsStore.views.connectWidgetPanels" :key="index"
            :h="widget.title && widget.fold ? undefined : 150"
            class="rounded-2xl p-1 text-primary dou-sc-colorborder"
          />
        </template> -->
      </div>
    </template>

    <div class="flex items-center justify-end">
      <button class="dou-sc-btn" :disabled="dsStore.updatingDeviceList" @click="onConnectBtnClick">
        <div v-if="dsStore.updatingDeviceList" class="i-mingcute-loading-fill animate-spin" />
        {{
          $t('connect_panel.add_device')
        }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
table {
  @apply min-w-full w-0;

  .label {
    @apply text-primary/70 font-bold whitespace-pre-wrap;
  }

  .value {
    @apply opacity-70 text-right;
  }
}
</style>
