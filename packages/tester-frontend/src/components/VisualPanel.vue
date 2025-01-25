<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import AccelValueBar from './GyroValueBar.vue';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import SelectBox from './common/SelectBox.vue';
import GeneralModelEntry from './model/GeneralModelEntry.vue';
import VisualizerPanelShell from './common/VisualizerPanelShell.vue';
const dualsenseStore = useDualSenseStore();
const { isDeviceReady, views } = storeToRefs(dualsenseStore)
const { t } = useI18n()

const showValue = ref(0)
const showValueSets = computed(() => {
	return [
		{
			value: 0,
			label: t('info_panel.model_value.off')
		},
		{
			value: 1,
			label: t('info_panel.model_value.on')
		},
	]
})
</script>

<template>
  <div v-if="!isDeviceReady" class="h-full flex items-center justify-center text-lg text-primary/70 select-none">
    {{ $t('info_panel.tips') }}
  </div>
  <div v-else class="flex flex-col items-center max-w-650px mx-auto gap-4">
    <div class="w-full">
      <h1 class="dou-sc-subtitle flex flex-col gap-2 items-center">{{ $t('info_panel.title_buttons') }}
        <SelectBox v-model="showValue" :options="showValueSets" />
      </h1>
      <component :is="views.modelPanel" :show-value="Boolean(showValue)" />
    </div>
    <template v-if="views.visualizerPanels">
      <div class="flex flex-col gap-2 w-full max-w-600px">
        <VisualizerPanelShell v-for="item, index of views.visualizerPanels" :key="index" :item="item"
          :show-value="Boolean(showValue)" />
      </div>
    </template>
    <!-- <GeneralModelEntry :showValue="Boolean(showValue)" />
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_gyroscope') }}</h1>
        <AccelValueBar :title="$t('info_panel.pitch')" :value="inputVisualInfo.gyroPitch" />
        <AccelValueBar :title="$t('info_panel.yaw')" :value="inputVisualInfo.gyroYaw" />
        <AccelValueBar :title="$t('info_panel.roll')" :value="inputVisualInfo.gyroRoll" />
        <h1 class="dou-sc-subtitle">{{ $t('info_panel.title_accelerometer') }}</h1>

        <div class="flex justify-between w-full text-primary font-sans">
            <p class="font-bold">X</p>
            <p class="w-1/2 text-right">{{ test(inputVisualInfo.accelX) }}</p>
        </div>
        <div class="flex justify-between w-full text-primary font-sans">
            <p class="font-bold">Y</p>
            <p class="w-1/2 text-right">{{ test(inputVisualInfo.accelY) }}</p>
        </div>
        <div class="flex justify-between w-full text-primary font-sans">
            <p class="font-bold">Z</p>
            <p class="w-1/2 text-right">{{ test(inputVisualInfo.accelZ) }}</p>
        </div> -->
  </div>
</template>

<style scoped></style>
