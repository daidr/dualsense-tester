<script setup lang="ts">
import ControllerTextButton from '@/components/common/ControllerTextButton.vue';
import { DSEProfileIntensity, type DSEProfile } from '../profile';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import DouSelect from '@/components/base/DouSelect.vue';

const props = defineProps<{
  profile: DSEProfile
}>()

const { t } = useI18n()

const intensitySets = computed(() => {
  return [
    {
      value: DSEProfileIntensity.Off,
      label: t('profile_mode.intensity_level.off'),
    },
    {
      value: DSEProfileIntensity.Weak,
      label: t('profile_mode.intensity_level.weak'),
    },
    {
      value: DSEProfileIntensity.Medium,
      label: t('profile_mode.intensity_level.medium'),
    },
    {
      value: DSEProfileIntensity.Strong,
      label: t('profile_mode.intensity_level.strong'),
    },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-2 items-start">
      <p class="font-bold">{{ $t('profile_mode.vibration_intensity_label') }}</p>
      <p class="text-sm opacity-70">{{ $t('profile_mode.vibration_intensity_desc') }}</p>
      <DouSelect v-model="profile.vibrationIntensity" :options="intensitySets" />
    </div>
    <div class="flex flex-col gap-2 items-start">
      <p class="font-bold">{{ $t('profile_mode.trigger_effect_intensity_label') }}</p>
      <i18n-t keypath="profile_mode.trigger_effect_intensity_desc" tag="p" class="text-sm opacity-70" scope="global">
        <template #L2>
          <ControllerTextButton text="L2" small />
        </template>
        <template #R2>
          <ControllerTextButton text="R2" small />
        </template>
      </i18n-t>
      <DouSelect v-model="profile.triggerEffectIntensity" :options="intensitySets" />
    </div>
  </div>
</template>

<style scoped></style>
