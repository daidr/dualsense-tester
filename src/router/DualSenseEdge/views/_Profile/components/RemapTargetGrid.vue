<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DSEProfileButtonLabelMap, DSEProfileMappingTargets } from '../profile'
import { BUTTON_ICON, BUTTON_TEXT, DISABLED_VALUE } from './buttonMappingLayout'
import ControlGlyph from './ControlGlyph.vue'

defineProps<{
  /** currently selected target byte, or DISABLED_VALUE when the source is disabled */
  current: number
  /** whether this source button may be disabled (CROSS / CIRCLE may not) */
  canDisable?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', value: number): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid">
    <button
      v-for="target in DSEProfileMappingTargets"
      :key="target"
      type="button"
      class="opt"
      :class="{ on: current === target }"
      @click="emit('select', target)"
    >
      <ControlGlyph :icon="BUTTON_ICON[target]" :text="BUTTON_TEXT[target] ?? DSEProfileButtonLabelMap[target]" />
    </button>
    <button
      v-if="canDisable"
      type="button"
      class="opt opt-disable"
      :class="{ on: current === DISABLED_VALUE }"
      @click="emit('select', DISABLED_VALUE)"
    >
      {{ t('profile_mode.custom_button_mapping.disabled') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.grid {
  @apply grid grid-cols-4 gap-1;
  min-width: 13rem;
}

.opt {
  @apply rounded-lg px-1.5 py-1.5 text-xs font-medium cursor-pointer;
  // flex-centre so the icon/text glyph is vertically centred rather than sitting
  // on the text baseline (which pushed it visibly upward)
  @apply flex items-center justify-center min-h-8;
  @apply transition-colors text-center whitespace-nowrap;
  @apply bg-black/5 dark-bg-white/8 text-black/80 dark-text-white/80;

  &:hover {
    @apply bg-primary/15 text-primary;
  }

  &.on {
    @apply bg-primary text-white;
  }
}

.opt-disable {
  @apply col-span-4;

  &.on {
    @apply bg-rose-500 text-white;
  }

  &:hover:not(.on) {
    @apply bg-rose-500/15 text-rose-500;
  }
}
</style>
