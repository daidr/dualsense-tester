<script setup lang="ts">
import type { DSEProfile } from '../profile'
import { computed } from 'vue'
import Assignment from '@/components/Configuration/Assignment.vue'
import {
  DSEProfileButtonLabelMap,
  DSEProfileMappingButtons,
  normalizeProfileButtonMapping,
} from '../profile'

const props = defineProps<{
  profile: DSEProfile
}>()

const buttonMappingOptions = computed(() => DSEProfileMappingButtons.map(button => ({
  value: button,
  label: DSEProfileButtonLabelMap[button],
})))

const buttonMappingLabels = computed(() => DSEProfileMappingButtons.map(button => DSEProfileButtonLabelMap[button]))

const buttonMapping = computed({
  get: () => normalizeProfileButtonMapping(props.profile.buttonMapping),
  set: (value) => {
    props.profile.buttonMapping = normalizeProfileButtonMapping(value)
  },
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm opacity-70">
      {{ $t('profile_mode.custom_button_mapping_label') }}
    </p>
    <Assignment v-model="buttonMapping" :row-labels="buttonMappingLabels" :options="buttonMappingOptions" />
  </div>
</template>

<style scoped></style>
