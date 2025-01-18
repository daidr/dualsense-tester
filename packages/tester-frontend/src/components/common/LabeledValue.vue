<script setup lang="ts">
defineProps({
    label: String
})

defineSlots<{
    default: () => any
}>()
</script>

<template>
    <div class="flex justify-between gap-2 text-sm labeled-value px-1 rounded-lg">
        <div class="font-bold select-none flex-shrink-0">{{ label }}</div>
        <div class="opacity-80 font-mono break-all whitespace-pre-wrap flex-grow text-right">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.labeled-value {
    @apply transform-gpu;
    &:hover {
        @apply bg-primary/10 dark-bg-primary/30;
    }
}
</style>