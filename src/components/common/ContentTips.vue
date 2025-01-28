<script setup lang="ts">
defineProps<{
    icon?: string
    title?: string
}>()
</script>

<template>
    <div class="dou-sc-autoborder p-4 rounded-24px space-y-2">
        <div class="flex text-primary font-bold items-center space-x-1 text-lg lh-1em">
            <div :class="icon ?? 'i-icon-park-twotone-grinning-face-with-open-mouth'"></div>
            <div>{{ title ?? $t('common.tips') }}</div>
        </div>
        <div>
            <slot></slot>
        </div>
    </div>
</template>

<style scoped lang="scss"></style>