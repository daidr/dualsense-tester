<script setup lang="ts">
import { computed } from 'vue';
import type { InnerModelProps } from '../shared';
import { numberToXHex } from '@/utils/format.util';

const props = defineProps<InnerModelProps>()

const STICK_REAL_RADIUS = 86

const getStickPoint = (x: number) => {
    return STICK_REAL_RADIUS * x
}

const computedStickRightStyle = computed(() => {
    return {
        transform: `translate(${getStickPoint(props.inputVisualInfo.stickRX)}px, ${getStickPoint(props.inputVisualInfo.stickRY)}px)`
    }
})

const computedStickLeftStyle = computed(() => {
    return {
        transform: `translate(${getStickPoint(props.inputVisualInfo.stickLX)}px, ${getStickPoint(props.inputVisualInfo.stickLY)}px)`
    }
})

function showTouchPoint(id: number) {
    if (props.showValue) {
        return true
    }

    return id < 128
}

const TOUCHPAD_REAL_LEFT = 442
const TOUCHPAD_REAL_TOP = 230
const TOUCHPAD_REAL_WIDTH = 430
const TOUCHPAD_REAL_HEIGHT = 235

const TOUCHPAD_RANGE_X = 1920
const TOUCHPAD_RANGE_Y = 1080

const TOUCHPAD_XF = TOUCHPAD_REAL_WIDTH / TOUCHPAD_RANGE_X
const TOUCHPAD_YF = TOUCHPAD_REAL_HEIGHT / TOUCHPAD_RANGE_Y

const getTouchPointX = (x: number) => {
    return x * TOUCHPAD_XF + TOUCHPAD_REAL_LEFT
}

const getTouchPointY = (y: number) => {
    return y * TOUCHPAD_YF + TOUCHPAD_REAL_TOP
}
</script>

<template>
    <g id="Cover">
        <path id="Active_PS" v-if="inputVisualInfo.ps" class="fill-primary"
            d="M642.084 595.553c.4-.064.831-.131 1.219-.201v-6.289l-6.109 2.173c-2.256.792-5.563.961-7.393.375-1.832-.59-1.486-1.707.766-2.502l12.736-4.468v-7.028l-17.699 6.166s-4.283 1.374-6.806 3.209c-2.724 1.979-1.725 5.415 4.251 7.065 6.417 2.073 12.926 2.481 19.035 1.5m18.305 6.238 26.982-9.5s3.629-1.304 5.111-3.134c1.478-1.832.825-4.492-5.004-6.294-5.166-1.918-11.75-2.579-17.128-1.998-5.376.584-9.198 1.907-9.198 1.907l-.763.254v7.272l13.231-4.569c2.255-.796 5.566-.962 7.395-.375 1.83.589 1.487 1.706-.768 2.499l-19.858 6.932v7.006Zm2.322-51.94c10.456 3.517 13.997 7.896 13.997 17.758 0 9.616-6.056 13.261-13.753 9.621v-17.916c.008-3.538-1.313-4.368-2.464-4.604-1.567-.319-2.443.937-2.443 3.037v44.859l-12.348-3.841v-53.483c5.253.954 12.897 3.211 17.011 4.569" />

        <g :style="computedStickLeftStyle">
            <circle cx="467" cy="582.5" r="70" class="ds-stick" :class="{ 'ds-stick-active': inputVisualInfo.l3 }" />
            <!-- central point -->
            <circle v-if="showValue" cx="467" cy="582.5" r="3" class="ds-fill-red" />
        </g>
        <!-- cross line -->
        <line v-if="showValue" x1="467" y1="493" x2="467" y2="671" class="ds-stroke-dashed" />
        <line v-if="showValue" x1="378" y1="582" x2="558" y2="582" class="ds-stroke-dashed" />

        <g :style="computedStickRightStyle">
            <circle id="Active_RS" class="ds-stick" :class="{ 'ds-stick-active': inputVisualInfo.r3 }" cx="845" cy="582"
                r="70" />
            <!-- central point -->
            <circle v-if="showValue" cx="845" cy="582" r="3" class="ds-fill-red" />
        </g>
        <!-- cross line -->
        <line v-if="showValue" x1="845" y1="493" x2="845" y2="671" class="ds-stroke-dashed" />
        <line v-if="showValue" x1="756" y1="582" x2="935" y2="582" class="ds-stroke-dashed" />
        <g id="TouchPadCover">
            <rect v-if="showValue" x="442" y="230" width="430" height="235" class="ds-stroke-dashed" />
            <g v-if="showTouchPoint(inputVisualInfo.touchpadID1)" :style="{
                transform: `translate(${getTouchPointX(inputVisualInfo.touchpadX1)}px, ${getTouchPointY(inputVisualInfo.touchpadY1)}px)`
            }">
                <circle r="19" class="ds-filled-icon" :cx="0" :cy="0" />
                <text x="0" y="40" font-size="25" class="ds-text" text-anchor="middle">{{
                    numberToXHex(inputVisualInfo.touchpadID1, 2) }}</text>
                <text x="0" y="-25" font-size="25" class="ds-text" text-anchor="middle">{{
                    inputVisualInfo.touchpadX1 }},{{
                        inputVisualInfo.touchpadY1 }}</text>
            </g>
            <g v-if="showTouchPoint(inputVisualInfo.touchpadID2)" :style="{
                transform: `translate(${getTouchPointX(inputVisualInfo.touchpadX2)}px, ${getTouchPointY(inputVisualInfo.touchpadY2)}px)`
            }">
                <circle r="19" class="ds-filled-icon" :cx="0" :cy="0" />
                <text x="0" y="40" font-size="25" class="ds-text" text-anchor="middle">{{
                    numberToXHex(inputVisualInfo.touchpadID2, 2) }}</text>
                <text x="0" y="-25" font-size="25" class="ds-text" text-anchor="middle">{{
                    inputVisualInfo.touchpadX2 }},{{
                        inputVisualInfo.touchpadY2 }}</text>
            </g>
        </g>
    </g>
</template>

<style scoped>
.ds-fill-primary {
    @apply fill-primary;
}

.ds-stick {
    @apply fill-white/40 dark-fill-black/40 stroke-black dark-stroke-white stroke-2;

    &.ds-stick-active {
        @apply fill-primary stroke-primary;
    }
}

.ds-fill-red {
    @apply fill-red-700;
}

.ds-stroke-dashed {
    @apply stroke-3px stroke-black/50 dark-stroke-white/50 fill-none;
    stroke-dasharray: 5;
}

.ds-filled-icon {
    @apply fill-black/50 dark-fill-white/50;
}

.ds-text {
    @apply fill-black dark-fill-white;
    @apply font-mono select-none;
    @apply bg-black;
}
</style>