<script setup lang="ts">
import type { ControlLayout } from '../components/buttonMappingLayout'
import type { DSEProfile } from '../profile'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DouSwitch from '@/components/base/DouSwitch.vue'
import { BUTTON_ICON, BUTTON_TEXT, CONTROL_ICON, CONTROL_TEXT, DISABLED_VALUE } from '../components/buttonMappingLayout'
import ButtonMappingModel from '../components/ButtonMappingModel.vue'
import ControlGlyph from '../components/ControlGlyph.vue'
import MappingCapsule from '../components/MappingCapsule.vue'
import RemapTargetGrid from '../components/RemapTargetGrid.vue'
import {
  DSEProfileButton,
  DSEProfileButtonLabelMap,
  DSEProfileDisabledButtonBitMap,
  DSEProfileMappingButtonDisableBit,
  DSEProfileMappingButtons,
  isProfileButtonDisabled,
  normalizeProfileButtonMapping,
  setProfileButtonDisabled,
} from '../profile'

const props = defineProps<{
  profile: DSEProfile
}>()

const { t } = useI18n()

// disableButtons bit for the enable/disable-only controls.
const TOGGLE_BIT: Record<string, DSEProfileDisabledButtonBitMap> = {
  CREATE: DSEProfileDisabledButtonBitMap.CREATE,
  OPTIONS: DSEProfileDisabledButtonBitMap.OPTIONS,
  PS: DSEProfileDisabledButtonBitMap.PS,
}

// Per-stick wiring: the deflection-disable bit and which physical click button
// the stick press remaps (L3 -> mapping[13], R3 -> mapping[10]).
const STICK: Record<string, { enableBit: DSEProfileDisabledButtonBitMap, clickButton: DSEProfileButton }> = {
  L3: { enableBit: DSEProfileDisabledButtonBitMap.STICK_LEFT, clickButton: DSEProfileButton.L3 },
  R3: { enableBit: DSEProfileDisabledButtonBitMap.STICK_RIGHT, clickButton: DSEProfileButton.R3 },
}

const mappingButtons = DSEProfileMappingButtons as readonly DSEProfileButton[]
const mapping = computed(() => normalizeProfileButtonMapping(props.profile.buttonMapping))

function readBit(bit: DSEProfileDisabledButtonBitMap) {
  return isProfileButtonDisabled(props.profile.disableButtons, bit)
}

function writeBit(bit: DSEProfileDisabledButtonBitMap, value: boolean) {
  props.profile.disableButtons = setProfileButtonDisabled(props.profile.disableButtons, bit, value)
}

// --- remap (also reused for the stick-press remap) ---

function remapState(button: DSEProfileButton) {
  const index = mappingButtons.indexOf(button)
  const disableBit = DSEProfileMappingButtonDisableBit[button]
  const disabled = disableBit !== undefined && readBit(disableBit)
  const target = mapping.value[index]
  return {
    index,
    disableBit,
    disabled,
    target,
    mapped: !disabled && target !== button,
    current: disabled ? DISABLED_VALUE : target,
  }
}

function applyRemap(button: DSEProfileButton, value: number) {
  const disableBit = DSEProfileMappingButtonDisableBit[button]
  if (value === DISABLED_VALUE) {
    if (disableBit !== undefined) {
      writeBit(disableBit, true)
    }
    return
  }
  const index = mappingButtons.indexOf(button)
  const next = normalizeProfileButtonMapping(props.profile.buttonMapping)
  next[index] = value
  props.profile.buttonMapping = next
  if (disableBit !== undefined) {
    writeBit(disableBit, false)
  }
}

// --- glyphs (fancy-controller icon, with text fallback) ---

function controlIcon(control: ControlLayout) {
  return CONTROL_ICON[control.id]
}

function controlText(control: ControlLayout) {
  return CONTROL_TEXT[control.id] ?? control.id
}

function targetIcon(button: number) {
  return BUTTON_ICON[button]
}

function targetText(button: number) {
  return BUTTON_TEXT[button] ?? DSEProfileButtonLabelMap[button] ?? '—'
}

// A remap capsule shows what the button is bound *to* (its target), not its own
// physical key. When disabled it shows a bare slash with no icon.
function remapCapsuleIcon(button: DSEProfileButton) {
  const state = remapState(button)
  return state.disabled ? undefined : targetIcon(state.target)
}

function remapCapsuleText(button: DSEProfileButton) {
  const state = remapState(button)
  return state.disabled ? '/' : targetText(state.target)
}

// --- toggle (CREATE / OPTIONS / PS) ---

function toggleEnabled(id: string) {
  return !readBit(TOGGLE_BIT[id])
}

function setToggleEnabled(id: string, enabled: boolean) {
  writeBit(TOGGLE_BIT[id], !enabled)
}

// --- stick (L3 / R3) ---

function stickClickButton(id: string) {
  return STICK[id].clickButton
}

function stickEnabled(id: string) {
  return !readBit(STICK[id].enableBit)
}

function setStickEnabled(id: string, enabled: boolean) {
  writeBit(STICK[id].enableBit, !enabled)
}

// Stick swapping is a single global flag (a *set* bit means swapping is on).
const swapSticks = computed({
  get: () => readBit(DSEProfileDisabledButtonBitMap.ENABLE_STICK_SWAPPING),
  set: value => writeBit(DSEProfileDisabledButtonBitMap.ENABLE_STICK_SWAPPING, value),
})

// --- touchpad ---

const touchpadEnabled = computed({
  get: () => !readBit(DSEProfileDisabledButtonBitMap.TOUCHPAD),
  set: value => writeBit(DSEProfileDisabledButtonBitMap.TOUCHPAD, !value),
})

const touchpadButtonEnabled = computed({
  get: () => !readBit(DSEProfileDisabledButtonBitMap.TOUCHPAD_BUTTON),
  set: value => writeBit(DSEProfileDisabledButtonBitMap.TOUCHPAD_BUTTON, !value),
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm opacity-70">
      {{ $t('profile_mode.custom_button_mapping_label') }}
    </p>

    <ButtonMappingModel>
      <template #capsule="{ control }">
        <!-- remappable buttons -->
        <MappingCapsule
          v-if="control.kind === 'remap'"
          :control-id="control.id"
          :icon="remapCapsuleIcon(control.button!)"
          :label="remapCapsuleText(control.button!)"
          :disabled="remapState(control.button!).disabled"
          :mapped="remapState(control.button!).mapped"
        >
          <template #default="{ close }">
            <div class="pop-head">
              <ControlGlyph class="src" :icon="controlIcon(control)" :text="controlText(control)" />
              <span class="arrow">→</span>
              <span v-if="remapState(control.button!).disabled" class="dst">
                {{ t('profile_mode.custom_button_mapping.disabled') }}
              </span>
              <ControlGlyph
                v-else
                class="dst"
                :icon="targetIcon(remapState(control.button!).target)"
                :text="targetText(remapState(control.button!).target)"
              />
            </div>
            <RemapTargetGrid
              :current="remapState(control.button!).current"
              :can-disable="remapState(control.button!).disableBit !== undefined"
              @select="(value) => { applyRemap(control.button!, value); close() }"
            />
          </template>
        </MappingCapsule>

        <!-- enable/disable-only buttons (Create / Options / PS) -->
        <MappingCapsule
          v-else-if="control.kind === 'toggle'"
          :control-id="control.id"
          :icon="controlIcon(control)"
          :label="controlText(control)"
          :disabled="!toggleEnabled(control.id)"
        >
          <div class="pop-row">
            <span>{{ t('profile_mode.custom_button_mapping.enabled') }}</span>
            <DouSwitch
              :model-value="toggleEnabled(control.id)"
              @update:model-value="(value) => setToggleEnabled(control.id, !!value)"
            />
          </div>
        </MappingCapsule>

        <!-- sticks (L3 / R3) -->
        <MappingCapsule
          v-else-if="control.kind === 'stick'"
          :control-id="control.id"
          :icon="controlIcon(control)"
          :label="controlText(control)"
          :disabled="!stickEnabled(control.id)"
          :mapped="remapState(stickClickButton(control.id)).mapped"
        >
          <div class="pop-stack">
            <div class="pop-row">
              <span>{{ t('profile_mode.custom_button_mapping.stick') }}</span>
              <DouSwitch
                :model-value="stickEnabled(control.id)"
                @update:model-value="(value) => setStickEnabled(control.id, !!value)"
              />
            </div>
            <div class="pop-row">
              <span>{{ t('profile_mode.custom_button_mapping.swap_sticks') }}</span>
              <DouSwitch v-model="swapSticks" />
            </div>
            <div class="pop-sub">
              {{ t('profile_mode.custom_button_mapping.stick_click') }}
            </div>
            <RemapTargetGrid
              :current="remapState(stickClickButton(control.id)).current"
              :can-disable="true"
              @select="(value) => applyRemap(stickClickButton(control.id), value)"
            />
          </div>
        </MappingCapsule>

        <!-- touchpad -->
        <MappingCapsule
          v-else
          :control-id="control.id"
          :icon="controlIcon(control)"
          :label="controlText(control)"
          :disabled="!touchpadEnabled"
        >
          <div class="pop-stack">
            <div class="pop-row">
              <span>{{ t('profile_mode.custom_button_mapping.touchpad') }}</span>
              <DouSwitch v-model="touchpadEnabled" />
            </div>
            <div class="pop-row">
              <span>{{ t('profile_mode.custom_button_mapping.touchpad_button') }}</span>
              <DouSwitch v-model="touchpadButtonEnabled" />
            </div>
          </div>
        </MappingCapsule>
      </template>
    </ButtonMappingModel>
  </div>
</template>

<style scoped lang="scss">
.pop-head {
  @apply flex items-center gap-1.5 px-1.5 pt-1 pb-2 text-sm font-semibold;

  .arrow {
    @apply opacity-40;
  }

  .dst {
    @apply text-primary;
  }
}

.pop-row {
  @apply flex items-center justify-between gap-4 px-1.5 py-1.5 text-sm;
  min-width: 11rem;
}

.pop-stack {
  @apply flex flex-col gap-1;
}

.pop-sub {
  @apply px-1.5 pt-2 pb-1 text-xs font-semibold opacity-60;
}
</style>
