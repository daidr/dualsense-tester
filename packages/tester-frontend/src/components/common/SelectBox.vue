<script setup lang="ts" generic="T extends string | number | symbol">
import { useElementBounding, useWindowSize } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

const modelValue = defineModel<T>({ required: true })

defineProps<{
    options: {
        value: T
        label: string
    }[]
}>()

const updateValue = (value: T) => {
    modelValue.value = value
    open.value = false
}

const open = ref(false)
const SelectBoxRef = ref<HTMLElement | null>(null)
const PopupRef = ref<HTMLElement | null>(null)
const { x, y, height, update } = useElementBounding(SelectBoxRef)
const { width } = useElementBounding(PopupRef)
const { width: wWidth } = useWindowSize()
const safeX = computed(() => {
    if (x.value + width.value + 20 < wWidth.value) {
        return x.value;
    } else {
        return wWidth.value - width.value - 20;
    }
})

watch(open, () => {
    update()
})
</script>

<template>
    <div ref="SelectBoxRef" class="select-wrapper" @click="open = !open">
        <div class="label">
            <template v-for="option of options" :key="option.value">
                <div v-if="modelValue === option.value">{{ option.label }}</div>
            </template>
        </div>
        <div class="icon i-mingcute-down-line"></div>
        <Teleport to="body">
            <div v-if="open" class="mask" @click="open = false"></div>
            <Transition name="blur-fade">
                <div ref="PopupRef" v-if="open" class="popup-wrapper" :style="{
                    '--x': safeX + 'px',
                    '--y': y + height + 5 + 'px',
                }">
                    <div class="popup-content">
                        <template v-for="option of options" :key="option.value">
                            <div @click="updateValue(option.value)">{{ option.label }}</div>
                        </template>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped lang="scss">
.popup-wrapper {
    @apply fixed z-10 select-none;
    @apply dou-sc-colorborder bg-white dark-bg-black rounded-2xl;
    @apply overflow-hidden;

    --x: 0;
    --y: 0;

    top: var(--y);
    left: var(--x);

    .popup-content {
        @apply max-h-200px overflow-y-auto text-primary;

        @apply text-sm;

        div {
            @apply m-1 py-1 pl-2 pr-3 min-w-30;
            @apply rounded-xl;
            @apply transition-colors;
            @apply cursor-pointer;

            &:hover {
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
    @apply pl-2 pr-1 py-0.5;
    @apply rounded-full text-primary dou-sc-colorborder;
    @apply transition;

    &:active {
        @apply bg-primary text-white;

        .label {
            @apply text-white;
        }
    }
}
</style>
