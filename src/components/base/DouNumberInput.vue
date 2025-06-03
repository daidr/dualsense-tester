<script setup lang="ts">
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput, NumberFieldRoot } from 'reka-ui'

defineProps<{
    min?: number
    max?: number
    disabled?: boolean
}>()

const value = defineModel<number>()

</script>

<template>
    <NumberFieldRoot :min="min" :max="max" :disabled="disabled" v-model="value">
        <div class="number-input-wrapper">
            <NumberFieldDecrement class="number-button">
                <div class="i-mingcute-minimize-line"></div>
            </NumberFieldDecrement>
            <NumberFieldInput class="number-input" />
            <NumberFieldIncrement class="number-button">
                <div class="i-mingcute-add-line"></div>
            </NumberFieldIncrement>
        </div>
    </NumberFieldRoot>
</template>


<style scoped lang="scss">
.number-input-wrapper {
    @apply mt-1 flex items-center rounded-full h-9 dou-sc-colorborder text-primary;
    @apply transition-colors;

    &:hover {
        @apply bg-stone-100 dark:bg-stone-900;
    }
}

.number-button {
    @apply p-2 disabled:opacity-40;
}

.number-input {
    @apply bg-transparent w-20 tabular-nums text-center focus:outline-0 p-1;
}
</style>
