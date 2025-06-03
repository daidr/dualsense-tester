<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionShell from './common/ConditionShell.vue'
import VisualizerPanelShell from './common/VisualizerPanelShell.vue'
import DouSelect from './base/DouSelect.vue'
import { LayoutGroup, m } from 'motion-v'

const dualsenseStore = useDualSenseStore()
const { isDeviceReady, views } = storeToRefs(dualsenseStore)
const { t } = useI18n()

const showValue = ref(0)
const showValueSets = computed(() => {
  return [
    {
      value: 0,
      label: t('info_panel.model_value.off'),
    },
    {
      value: 1,
      label: t('info_panel.model_value.on'),
    },
  ]
})
</script>

<template>
  <div v-if="!isDeviceReady" class="h-full flex select-none items-center justify-center text-lg text-primary/70">
    {{ $t('info_panel.tips') }}
  </div>
  <LayoutGroup v-else>
    <m.div class="mx-auto max-w-650px flex flex-col items-center gap-4">
      <div class="w-full">
        <h1 class="dou-sc-subtitle flex flex-col items-center gap-2">
          {{ $t('info_panel.title_buttons') }}
          <DouSelect v-model="showValue" :options="showValueSets" />
        </h1>
        <component :is="views.modelPanel" :show-value="Boolean(showValue)" />
      </div>
      <template v-if="views.visualizerPanels?.length">
        <m.div layout="position" class="max-w-600px w-full flex flex-col gap-2 bg-white dark-bg-black">
          <ConditionShell :shell="VisualizerPanelShell" :widgets="views.visualizerPanels"
            :shell-props="{ showValue: Boolean(showValue) }" />
        </m.div>
      </template>
    </m.div>
  </LayoutGroup>
</template>

<style scoped></style>
