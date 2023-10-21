<script setup lang="ts">
import { useElementBounding } from '@vueuse/core';
import { computed, ref } from 'vue';

const modelValue = defineModel<number>({ required: true })

const props = defineProps<{
    min: number,
    max: number
}>()

const TrackRef = ref<HTMLDivElement | null>()

const { width } = useElementBounding(TrackRef, {
    windowScroll: false
})

const factor = computed(() => {
    console.log(width.value / (props.max - props.min))
    return width.value / (props.max - props.min)
})

let startX = 0
const onPointerDown = (e: PointerEvent) => {
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId)
    startX = e.clientX
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
}

const onPointerMove = (e: PointerEvent) => {
    const currentX = e.clientX
    const deltaX = (currentX - startX) / factor.value
    const current = modelValue.value + deltaX
    if (current < props.min) {
        modelValue.value = props.min
    } else if (current > props.max) {
        modelValue.value = props.max
    } else {
        modelValue.value = current
    }
    startX = currentX
}

const onPointerUp = (e: PointerEvent) => {
    (e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
}
</script>

<template>
    <div ref="TrackRef" class="w-auto h-2px rounded-full relative dou-sc-autobg" :style="{
        '--current-x': ((modelValue - props.min) / (props.max - props.min)) * 100 + '%'
    }">
        <div class="track"></div>
        <div class="thumb" @pointerdown="onPointerDown"></div>
    </div>
</template>

<style scoped lang="scss">
.thumb {
    @apply cursor-grab;
    @apply w-4 h-4 rounded-full bg-primary absolute top-1/2 left-[var(--current-x)] -translate-x-1/2 -translate-y-1/2;
}

.track {
    @apply bg-primary/60 absolute top-0 left-0 bottom-0 w-[var(--current-x)];
}
</style>