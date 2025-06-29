<script setup lang="ts">
import { LayoutGroup, m } from 'motion-v'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDualSenseStore } from '@/store/dualsense'
import { shellVariants } from '@/utils/common.util'
import DouSelect from './base/DouSelect.vue'
import ConditionShell from './common/ConditionShell.vue'
import LoadingView from './common/LoadingView.vue'
import VisualizerPanelShell from './common/VisualizerPanelShell.vue'

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
        <Suspense>
          <component :is="views.modelPanel" :show-value="Boolean(showValue)" />

          <template #fallback>
            <LoadingView
              layout="position" :h="300" class="w-full p-1 text-primary" :variants="shellVariants"
              initial="hidden" animate="visible" exit="hidden"
            />
          </template>
        </Suspense>
      </div>
      <template v-if="views.visualizerPanels?.length">
        <m.div layout="position" class="max-w-600px w-full flex flex-col gap-2 bg-white dark-bg-black">
          <ConditionShell
            :shell="VisualizerPanelShell" :widgets="views.visualizerPanels"
            :shell-props="{ showValue: Boolean(showValue) }"
          />
        </m.div>
      </template>
    </m.div>
  </LayoutGroup>
</template>

<style scoped></style>
