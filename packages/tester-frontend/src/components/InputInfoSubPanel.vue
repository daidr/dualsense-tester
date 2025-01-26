<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import { computed, ref } from 'vue';
import LabeledValue from './common/LabeledValue.vue';
import LocaleLabeledValue from './common/LocaleLabeledValue.vue';
import { storeToRefs } from 'pinia';
import InputSeqNumLabel from './InputSeqNumLabel.vue';

const { inputLabelInfo } = storeToRefs(useDualSenseStore())
</script>

<template>
    <div v-if="inputLabelInfo" class="text-primary dou-sc-colorborder rounded-2xl p-1">
        <div class="flex flex-col">
            <template v-if="inputLabelInfo">
                <InputSeqNumLabel />
                <LocaleLabeledValue v-for="item of inputLabelInfo" :value="item.value"
                    :value-locale-prefix="item.valueLocalePrefix" :label="item.label" :key="item.label" />
            </template>
        </div>
    </div>
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
