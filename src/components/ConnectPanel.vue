<script setup lang="ts">
import { computed } from 'vue'
import ContentTips from '@/components/common/ContentTips.vue'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { useDualSenseStore } from '@/store/dualsense'

import { gitDefine } from '@/utils/env.util'
import ConnectWidgetShell from './common/ConnectWidgetShell.vue'
// import LoadingView from './common/LoadingView.vue'
import DouSelect from './base/DouSelect.vue'
import DouButton from './base/DouButton.vue'
import { AnimatePresence, LayoutGroup, m } from 'motion-v'

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
  <LayoutGroup>
    <AnimatePresence>
      <m.div layout="position" class="w-full self-start space-y-2 dou-sc-container">
        <m.div layout="position" class="flex items-stretch gap-2">
          <DouSelect v-if="deviceList.length" class="min-w-0 flex-1" :options="deviceList"
            :model-value="dsStore.currentDeviceIndex" @update:model-value="dsStore.setCurrentDeviceIndex">
            <template #default="{ index, extra }">
              <div class="min-w-0 flex items-center gap-1 py-0.5 text-base">
                <div
                  class="rounded bg-black/10 px-1 text-xs text-black/70 font-mono dark-bg-white/20 dark-text-white/70"
                  :aria-label="`Device ${index + 1} of ${deviceList.length}`" :class="{
                  }">
                  #{{
                    index + 1 }}/{{ deviceList.length }}
                </div>
                <div class="ms-1 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="extra!.deviceName">
                  {{
                    extra!.deviceName }}
                </div>
                <div v-if="extra!.connectionType === DeviceConnectionType.Bluetooth" class="i-mingcute-bluetooth-line"
                  aria-label="Bluetooth Connection" />
                <div v-else class="i-mingcute-usb-line" aria-label="USB Connection" />
              </div>
            </template>
          </DouSelect>
          <div v-else class="flex-grow rounded-full bg-gray-100/50 p-1 py-0.5 dark:bg-gray-500/30" />
          <DouButton class="flex-shrink-0" :disabled="dsStore.updatingDeviceList" @click="onConnectBtnClick">
            <div v-if="dsStore.updatingDeviceList" class="i-mingcute-loading-fill animate-spin" />
            {{
              $t('connect_panel.add_device')
            }}
          </DouButton>
        </m.div>

        <template v-if="dsStore.views.connectWidgetPanels?.length && !dsStore.profileMode">
          <m.div layout="position" class="flex flex-col gap-y-2">
            <template v-if="dsStore.isDeviceReady">
              <ConnectWidgetShell v-for="widget, index of dsStore.views.connectWidgetPanels" :key="index"
                :item="widget" />
            </template>
            <!-- <template v-else>
          <LoadingView
            v-for="widget, index of dsStore.views.connectWidgetPanels" :key="index"
            :h="widget.title && widget.fold ? undefined : 150"
            class="rounded-2xl p-1 text-primary dou-sc-colorborder"
          />
        </template> -->
          </m.div>
        </template>
        <ContentTips v-if="!deviceList.length">
          <p v-html="$t('connect_panel.tips')" />
        </ContentTips>
      </m.div>
    </AnimatePresence>
  </LayoutGroup>
</template>

<style scoped lang="scss">
table {
  @apply min-w-full w-0;

  .label {
    @apply text-primary/70 font-bold whitespace-pre-wrap;
  }

  .value {
    @apply opacity-70 text-end;
  }
}
</style>
