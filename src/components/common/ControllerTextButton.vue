<script setup lang="ts">
defineProps<{
    text: string
    small?: boolean
}>()
</script>

<template>
    <div class="rounded px-1 mx-0.5 text-xs font-bold font-mono inline v-mid" :class="{
        'ring-1.5 ring-current': !small,
        'bg-[color-mix(in_srgb,currentColor,transparent_70%)]': !small,
        'bg-[color-mix(in_srgb,currentColor,transparent_80%)]': small,
    }">
        {{ text }}
    </div>
</template>

<style scoped></style>
