<script setup lang="ts">
import { ref, watch } from 'vue';

defineProps<{
    transform: string
}>()

// let historySize = 5;
// let pitchHistory = new Array(historySize).fill(0);
// let yawHistory = new Array(historySize).fill(0);
// let rollHistory = new Array(historySize).fill(0);

// let avaragePitch = ref(0);
// let avarageYaw = ref(0);
// let avarageRoll = ref(0);


// watch(() => props.pitch, () => {
//     pitchHistory.shift();
//     yawHistory.shift();
//     rollHistory.shift();
//     pitchHistory.push(props.pitch);
//     yawHistory.push(props.yaw);
//     rollHistory.push(props.roll);
//     avaragePitch.value = average(pitchHistory);
//     avarageYaw.value = average(yawHistory);
//     avarageRoll.value = average(rollHistory);
// })

// function average(array: number[]) {
//     let sum = array.reduce((a, b) => a + b, 0)
//     return sum / array.length;
// }
</script>





<template>
    <div class="cube" :style="{
        'transform': transform
    }">
        <div class="face front"></div>
        <div class="face left"></div>
        <div class="face top"></div>
        <div class="face bottom"></div>
        <div class="face right"></div>
        <div class="face back"></div>
    </div>
</template>

<style scoped lang="scss">
.cube {
    @apply absolute;
    top: 50%;
    left: 50%;
    transform-style: preserve-3d;

    .face {
        @apply absolute;
        @apply w-100px h-100px;
    }

    .front {
        transform: translate(-50%, -50%) rotateY(0deg) translateZ(50px);
        background: rgba(103, 148, 193, 0.68);
    }

    .left {
        transform: translate(-50%, -50%) rotateY(90deg) translateZ(50px);
        background: rgba(68, 113, 158, 0.68);
    }

    .top {
        transform: translate(-50%, -50%) rotateX(90deg) translateZ(50px);
        background: rgba(108, 153, 198, 0.68);
    }

    .bottom {
        transform: translate(-50%, -50%) rotateX(-90deg) translateZ(50px);
        background: rgba(28, 73, 118, 0.68);
    }

    .right {
        transform: translate(-50%, -50%) rotateY(-90deg) translateZ(50px);
        background: rgba(68, 113, 158, 0.68);
    }

    .back {
        transform: translate(-50%, -50%) rotateY(180deg) translateZ(50px);
        background: rgba(48, 93, 138, 0.68);
    }
}
</style>