<script setup lang="ts">
const modelValue = defineModel<boolean>({ required: true })

function onSwitch() {
  modelValue.value = !modelValue.value
}
</script>

<template>
  <div class="switch" @click="onSwitch">
    <div
      class="switch-thumb" :class="{
        active: modelValue,
      }"
    >
      <div v-if="modelValue">
        <slot v-if="$slots.on" name="on" />
      </div>
      <div v-else>
        <slot v-if="$slots.off" name="off" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.switch {
    @apply relative;
    @apply w-9 h-4;
    @apply rounded-full;
    @apply select-none cursor-pointer;
    @apply transition;
    @apply dou-sc-colorborder;

    &-thumb {
        @apply absolute top-1/2 left-1/2 w-5 h-5;
        @apply transform-gpu -translate-y-1/2 -translate-x-full;
        @apply bg-gray rounded-full text-xs color-white font-light;
        @apply transition-transform transform-gpu;
        @apply flex justify-center items-center;

        &.active {
            @apply translate-x-0 bg-primary;
        }
    }

    &:hover {
        .switch-thumb {
            @apply scale-130;
        }
    }

    &:active {
        .switch-thumb {
            @apply scale-110;
        }
    }
}
</style>
