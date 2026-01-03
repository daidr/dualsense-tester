<script setup lang="ts" generic="T extends string | number, U">
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { ref } from 'vue'

defineProps<{
  options: {
    value: T
    label: string
    extra?: U
  }[]
  label?: string
  placeholder?: string
  disabled?: boolean
}>()

defineSlots<{
  default: (props: { index: number, value: T, label: string, extra?: U }) => any
}>()

const modelValue = defineModel<T>({ required: true })

const open = ref(false)
</script>

<template>
  <SelectRoot v-model="modelValue" v-model:open="open" :disabled="disabled">
    <SelectTrigger
      v-bind="$attrs" class="select-wrapper" :class="{
        active: open,
      }" :aria-label="label"
    >
      <SelectValue :placeholder="placeholder" class="label">
        <template v-for="option, index of options" :key="option.value">
          <template v-if="modelValue === option.value">
            <template v-if="!$slots.default">
              {{ option.label }}
            </template>
            <slot v-else :value="option.value" :label="option.label" :extra="option.extra" :index="index" />
          </template>
        </template>
      </SelectValue>
      <div class="i-mingcute-down-line" />
    </SelectTrigger>
    <SelectPortal to="#teleport-container">
      <!-- <Transition name="trans-fade"> -->
      <SelectContent v-if="open" class="popup-wrapper" position="popper" :side-offset="5">
        <SelectScrollUpButton class="scroll-button">
          <div class="i-mingcute-up-fill" />
        </SelectScrollUpButton>

        <SelectViewport class="popup-content">
          <template v-for="option, index of options" :key="option.value">
            <SelectItem :value="option.value" class="popup-label">
              <SelectItemText>
                <template v-if="!$slots.default">
                  {{ option.label }}
                </template>
                <slot v-else :value="option.value" :label="option.label" :extra="option.extra" :index="index" />
              </SelectItemText>
            </SelectItem>
          </template>
        </SelectViewport>

        <SelectScrollDownButton class="scroll-button">
          <div class="i-mingcute-down-fill" />
        </SelectScrollDownButton>
      </SelectContent>
      <!-- </Transition> -->
    </SelectPortal>
  </SelectRoot>
</template>

<style lang="scss" scoped>
.select-wrapper {
  @apply flex items-center gap-1 text-sm cursor-pointer select-none;
  @apply ps-2 pe-1 py-0.5;
  @apply rounded-full text-primary dou-sc-colorborder;
  @apply transition duration-100;

  .label {
    @apply flex-grow min-w-0 whitespace-nowrap;
  }

  &:active,
  &.active {
    @apply bg-primary text-white;

    .label {
      @apply text-white;
    }
  }
}

.trans-fade-enter-active,
.trans-fade-leave-active {
  transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
}

.trans-fade-enter-from,
.trans-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

:deep(.popup-wrapper) {
  @apply dou-sc-colorborder bg-white dark-bg-black rounded-2xl;
  @apply z-10 select-none max-w-90vw;
  @apply overflow-hidden;
  @apply shadow-2xl shadow-black/20 dark-shadow-white/30;

  .popup-label {
    @apply m-1 py-1 ps-2 pe-3 min-w-30 min-w-0;
    @apply rounded-xl;
    @apply transition-colors;
    @apply cursor-pointer;

    &[data-disabled] {
      @apply text-gray-500 dark-text-gray-400;
      @apply cursor-not-allowed;
    }

    &[data-highlighted] {
      @apply bg-primary/15 dark-bg-primary/40 outline-none;
    }

    &.popup-label[data-state="checked"] {
      @apply bg-primary text-white;
    }
  }

  .popup-content {
    @apply text-primary text-sm max-h-90vh;
  }

  .scroll-button {
    @apply text-primary h-25px flex cursor-default items-center justify-center;
  }
}
</style>
