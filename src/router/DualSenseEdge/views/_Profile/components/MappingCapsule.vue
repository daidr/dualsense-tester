<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { inject, ref, watchEffect } from 'vue'
import { MAPPING_ACTIVE_KEY } from './buttonMappingLayout'
import ControlGlyph from './ControlGlyph.vue'

const props = defineProps<{
  /** the control id this capsule represents, used to drive the shared highlight */
  controlId: string
  /** fancy-controller icon class, when one exists for this control */
  icon?: string
  /** text shown when there is no icon */
  label: string
  // dimmed look when the control is disabled
  disabled?: boolean
  // accent look when remapped to something other than itself
  mapped?: boolean
}>()

const open = ref(false)
const hovering = ref(false)

// Hovering or editing (popover open) this capsule lights up its connector line
// and the matching body shape on the model.
const active = inject(MAPPING_ACTIVE_KEY, null)
watchEffect(() => {
  if (!active) {
    return
  }
  if (open.value || hovering.value) {
    active.setActive(props.controlId)
  }
  else if (active.activeId.value === props.controlId) {
    active.setActive(null)
  }
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="chip"
        :class="{ active: open, disabled, mapped }"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
      >
        <ControlGlyph :icon="icon" :text="label" />
      </button>
    </PopoverTrigger>
    <PopoverPortal to="#teleport-container">
      <PopoverContent class="mapping-popover" :side-offset="8" :collision-padding="12" align="center">
        <slot :close="() => (open = false)" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped lang="scss">
.chip {
  @apply inline-flex items-center justify-center whitespace-nowrap cursor-pointer;
  @apply rounded-full font-bold;
  @apply transition-colors duration-100;
  // sizes in em so the capsule scales with the stage font-size
  min-width: 3.4em;
  height: 2.6em;
  padding: 0 1.1em;
  font-size: 1em;
  @apply dou-sc-colorborder;
  // opaque background so the connector line passing underneath does not show through
  @apply text-black/85 dark-text-white/85 bg-white dark-bg-black;

  &:hover {
    @apply border-primary text-primary;
  }

  &.active {
    @apply bg-primary text-white border-primary;
  }

  &.mapped:not(.active) {
    @apply border-primary text-primary;
  }

  // Keep the background fully opaque so the connector line never shows through;
  // signal "disabled" with a dimmed (currentColor-tinted) glyph and a dashed
  // border instead of lowering the whole capsule's opacity. (Remap capsules also
  // render a bare slash when disabled, so no strikethrough is needed.)
  &.disabled:not(.active) {
    @apply border-dashed text-black/35 dark-text-white/35;
  }
}

:deep(.mapping-popover) {
  @apply dou-sc-colorborder bg-white dark-bg-black rounded-2xl;
  @apply z-10 p-1.5 select-none;
  @apply shadow-2xl shadow-black/20 dark-shadow-white/30;
  min-width: 9rem;
  max-width: 90vw;
}
</style>
