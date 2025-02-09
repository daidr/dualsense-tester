<script setup lang="ts" generic="T extends string | number | symbol, U">
import { useElementBounding, useWindowSize } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

defineProps<{
  options: {
    value: T
    label: string
    extra?: U
  }[]
}>()

defineSlots<{
  default: (props: { index: number, value: T, label: string, extra?: U }) => any
}>()

const modelValue = defineModel<T>({ required: true })
const open = ref(false)

function updateValue(value: T) {
  modelValue.value = value
  open.value = false
}

const SelectBoxRef = ref<HTMLElement | null>(null)
const PopupRef = ref<HTMLElement | null>(null)
const { x, y, height, update } = useElementBounding(SelectBoxRef)
const { width } = useElementBounding(PopupRef)
const { width: wWidth } = useWindowSize()
const safeX = computed(() => {
  if (x.value + width.value + 20 < wWidth.value) {
    return x.value
  }
  else {
    return wWidth.value - width.value - 20
  }
})

watch(open, () => {
  update()
})
</script>

<template>
  <div
    ref="SelectBoxRef" class="select-wrapper" :class="{
      active: open,
    }" @click="open = !open"
  >
    <div class="label">
      <template v-for="option, index of options" :key="option.value">
        <template v-if="modelValue === option.value">
          <template v-if="!$slots.default">
            {{ option.label }}
          </template>
          <slot v-else :value="option.value" :label="option.label" :extra="option.extra" :index="index" />
        </template>
      </template>
    </div>
    <div class="icon i-mingcute-down-line" />
    <Teleport to="#teleport-container">
      <div v-if="open" class="mask" @click="open = false" />
      <Transition name="trans-fade">
        <div
          v-if="open" ref="PopupRef" class="popup-wrapper" :style="{
            '--x': `${safeX}px`,
            '--y': `${y + height + 5}px`,
          }"
        >
          <div class="popup-content">
            <template v-for="option, index of options" :key="option.value">
              <div
                class="popup-label" :class="{
                  active: modelValue === option.value,
                }" @click="updateValue(option.value)"
              >
                <template v-if="!$slots.default">
                  {{ option.label }}
                </template>
                <slot v-else :value="option.value" :label="option.label" :extra="option.extra" :index="index" />
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.trans-fade-enter-active,
.trans-fade-leave-active {
  transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
}

.trans-fade-enter-from,
.trans-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.popup-wrapper {
  @apply fixed z-10 select-none max-w-90vw;
  @apply dou-sc-colorborder bg-white dark-bg-black rounded-2xl;
  @apply overflow-hidden;
  @apply shadow-2xl shadow-black/20 dark-shadow-white/30;

  --x: 0;
  --y: 0;

  top: var(--y);
  left: var(--x);

  .popup-content {
    @apply max-h-200px overflow-y-auto text-primary;

    @apply text-sm;

    .popup-label {
      @apply m-1 py-1 ps-2 pe-3 min-w-30 min-w-0;
      @apply rounded-xl;
      @apply transition-colors;
      @apply cursor-pointer;

      &:hover,
      &.active {
        @apply bg-primary/10 dark-bg-primary/40;
      }
    }
  }
}

.mask {
  @apply fixed z-9 inset-0;
}

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
</style>
