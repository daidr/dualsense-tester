<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import { computed, ref } from 'vue';
import LabeledValue from './common/LabeledValue.vue';
import { storeToRefs } from 'pinia';

const { deviceInfo } = storeToRefs(useDualSenseStore())


const showFactoryInfo = ref(false)
</script>

<template>
    <template v-if="deviceInfo?.length">
        <div class="factory-toggle" @click="showFactoryInfo = !showFactoryInfo">
            <div class="line"></div>
            {{ showFactoryInfo ? $t('connect_panel.hide_factory_info') : $t('connect_panel.show_factory_info') }}
            <div class="line"></div>
            <div class="text-lg i-mingcute-down-fill transform-gpu transition-transform" :class="{
                'rotate-180': showFactoryInfo
            }"></div>
        </div>
        <div v-if="showFactoryInfo" class="text-primary dou-sc-colorborder rounded-2xl p-1">
            <div class="flex flex-col">
                <LabeledValue v-for="item of deviceInfo" :label="item.label" :key="item.label">
                    {{ item.value }}
                </LabeledValue>
            </div>
        </div>
    </template>

</template>

<style scoped lang="scss">
.factory-toggle {
    --color: theme('colors.primary/0.8');

    &:hover {
        --color: theme('colors.primary');
    }

    @apply w-full flex items-center justify-center gap-2 px-1 rounded-xl;
    @apply text-[var(--color)] cursor-pointer text-sm font-bold;
    @apply transition-colors select-none;

    .line {
        @apply content-empty flex-grow;
        @apply h-2px bg-[var(--color)] rounded-full;
        @apply transition-colors;
    }

    @apply bg-transparent hover-bg-primary/10;
}
</style>
