<script setup lang="ts" generic="T extends string | number">
const modelValue = defineModel<T>({ required: true })

defineProps<{
    sets: {
        label: string
        value: T
    }[]
}>()

const onButtonClick = (value: T) => {
    modelValue.value = value
}
</script>

<template>
    <div class="dou-sc-colorborder h-1.5rem p-2px rounded-full relative flex gap-1">
        <button v-for="button of sets" :key="button.value" :class="{ active: button.value === modelValue }"
            @click="onButtonClick(button.value)">
            {{ button.label }}
        </button>
    </div>
</template>

<style scoped lang="scss">
button {
    @apply transition-colors;
    @apply flex items-center justify-center;
    @apply min-w-2.5em px-1 py-1px text-12px rounded-full;
    @apply text-primary;

    &.active {
        @apply bg-primary text-white;
    }
}
</style>