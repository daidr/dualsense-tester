<script setup lang="ts">
import { useInnerProfile, type DSEProfile } from './profile'
import { computed, defineAsyncComponent, inject, ref, shallowRef, watch } from 'vue'
import ProfileSwitchButton from './ProfileSwitchButton.vue'
import { useI18n } from 'vue-i18n';
import HexPreview from '@/components/common/HexPreview.vue';

const props = defineProps<{
  profile: DSEProfile
  active?: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const CustomButtonMapping = defineAsyncComponent(() => import('./pages/CustomButtonMapping.vue'))
const TriggerDeadzone = defineAsyncComponent(() => import('./pages/TriggerDeadZone.vue'))
const JoyStickSensitivity = defineAsyncComponent(() => import('./pages/JoyStickSensitivity.vue'))
const VibrationIntensity = defineAsyncComponent(() => import('./pages/VibrationIntensity.vue'))

const { t } = useI18n()

const router = computed(() => ([
  {
    label: t('profile_mode.trigger_deadzone_label'),
    component: TriggerDeadzone,
  },
  {
    label: t('profile_mode.joystick_sensitivity_label'),
    component: JoyStickSensitivity,
  },
  {
    label: t('profile_mode.custom_button_mapping_label'),
    component: CustomButtonMapping,
  },
  {
    label: t('profile_mode.vibration_intensity_label'),
    component: VibrationIntensity,
  },
]))

const activeRouterIndex = ref(-1)

const { innerProfile, reset } = useInnerProfile(() => props.profile)

watch(() => activeRouterIndex.value, () => {
  reset()
}, {
  flush: 'pre',
})
</script>

<template>
  <div class="h-full flex flex-col gap-2">
    <div class="header">
      <button class="exit-button" @click="$emit('close')">
        <div class="i-mingcute-close-fill" />
      </button>
      <div class="title">
        <div class="w-1em flex-shrink-0">
          <div v-if="active" class="h-2 w-2 rounded-full bg-green-6" />
        </div>
        <ProfileSwitchButton :button="profile.switchButton" />
        <div class="name overflow-hidden text-ellipsis whitespace-nowrap" :title="profile.label">
          {{ profile.label }}
        </div>
      </div>
      <div class="h-9 w-9" />
    </div>
    <div class="sub-header">
      <div class="category-button-wrapper">
        <div v-for="route, index of router" :key="index" class="category-button" :class="{
          active: activeRouterIndex === index,
        }" @click="activeRouterIndex = index">
          {{ route.label }}
        </div>
      </div>
    </div>
    <div class="main">
      <component :is="router[activeRouterIndex].component" v-if="activeRouterIndex !== -1" :profile="innerProfile" />
    </div>
    <div class="footer">
      <div>
        <div>{{ innerProfile }}</div>
      </div>
      <div class="flex gap-2">
        <HexPreview v-for="item, index of profile.rawData" :key="index" :data-view="item.buffer" />
      </div>
      <div class="flex gap-2">
        <HexPreview v-for="item, index of innerProfile.bytes" :key="index" :data-view="item" :trigger="innerProfile" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header {
  @apply flex justify-center items-center gap-2;

  .exit-button {
    @apply flex-shrink-0 select-none w-9 h-9 items-center justify-center flex dou-sc-colorborder rounded-full cursor-pointer transition-colors;

    &:hover,
    &:focus {
      @apply bg-primary/15;
    }

    &:active {
      @apply bg-primary/25;
    }
  }

  .title {
    @apply flex justify-center items-center gap-2 flex-grow;
  }

  @apply text-primary;
}

.sub-header {
  @apply select-none mb-6 mx-auto max-w-full;
  @apply overflow-x-auto;

  .category-button-wrapper {
    @apply flex gap-2;
  }

  .category-button {
    @apply whitespace-nowrap;
    @apply text-center p-1 px-3 dou-sc-colorborder rounded-full text-primary transition-colors;
    @apply cursor-pointer;

    &:hover,
    &:focus {
      @apply bg-primary/15;
    }

    &:active {
      @apply bg-primary/25;
    }

    &.active {
      @apply bg-primary text-white;
    }
  }
}

.main {
  @apply flex-grow;
}
</style>
