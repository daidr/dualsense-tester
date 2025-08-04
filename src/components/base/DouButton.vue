<script setup lang="ts">
defineProps<{
  disabled?: boolean
  small?: boolean
}>()
</script>

<template>
  <button class="button" :disabled="disabled" :class="[small ? 'button-small' : 'button-normal']">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.button {
    @apply transition bg-transparent dou-sc-colorborder text-primary rounded-full transform-gpu flex items-center gap-1;

    &.button-small {
        @apply text-sm px-1.5;
    }

    &.button-normal {
        @apply text-base px-4 py-1;
    }

    &:hover,
    &:active {
        @apply bg-primary text-white;
    }

    &:active {
        @apply scale-95;
    }

    &.button:disabled {
        @apply filter-grayscale bg-transparent scale-100 text-primary cursor-not-allowed;
    }
}
</style>
