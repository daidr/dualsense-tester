<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

const dualsenseStore = useDualSenseStore()
const { state } = storeToRefs(dualsenseStore)
const TouchpadGroupRef = ref<SVGElement | null>(null)

const TOUCHPAD_LEFT = 340
const TOUCHPAD_TOP = 160
const TOUCHPAD_REAL_WIDTH = 430
const TOUCHPAD_REAL_HEIGHT = 235

const TOUCHPAD_RANGEX = 1920
const TOUCHPAD_RANGEY = 1080

const TOUCHPAD_XF = TOUCHPAD_REAL_WIDTH / TOUCHPAD_RANGEX
const TOUCHPAD_YF = TOUCHPAD_REAL_HEIGHT / TOUCHPAD_RANGEY

const getTouchPointX = (x: number) => {
    return x * TOUCHPAD_XF + TOUCHPAD_LEFT
}

const getTouchPointY = (y: number) => {
    return y * TOUCHPAD_YF + TOUCHPAD_TOP
}

const STICK_REAL_REDIUS = 40

const getStickPoint = (x: number) => {
    return STICK_REAL_REDIUS * x
}
</script>

<template>
    <svg viewBox="0 0 1117 892">
        <path id="r2"
            d="M866.471,116.785l114.214,0c12.312,0 -1.248,-110.916 -78.919,-110.916c-37.32,-0 -51.81,110.916 -35.295,110.916Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.r2 }" :style="{
                '--un-fill-opacity': state.axes.r2
            }" />
        <path id="l2"
            d="M252.212,116.785l-114.214,0c-12.312,0 1.248,-110.916 78.919,-110.916c37.32,-0 51.81,110.916 35.295,110.916Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.l2 }" :style="{
                '--un-fill-opacity': state.axes.l2
            }" />
        <g id="dpad-up">
            <path
                d="M213.487,271.996c0,-11.214 -9.091,-20.305 -20.305,-20.305l-28.888,-0c-11.215,-0 -20.306,9.091 -20.306,20.305l0,24.336c0,6.286 2.397,12.335 6.703,16.915c6.856,7.293 17.331,18.436 23.351,24.838c1.218,1.296 2.917,2.031 4.696,2.031c1.778,-0 3.478,-0.735 4.696,-2.031c6.019,-6.402 16.494,-17.545 23.35,-24.838c4.306,-4.58 6.703,-10.629 6.703,-16.915c0,-6.766 0,-16.013 0,-24.336Z"
                class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.dPadUp }" />
            <path d="M168.337,270.016l18.658,0l-9.081,-9.08l-9.577,9.08Z" class="ds-filled-icon" />
        </g>
        <g id="dpad-down">
            <path
                d="M213.487,443.093c0,11.215 -9.091,20.306 -20.305,20.306l-28.888,-0c-11.215,-0 -20.306,-9.091 -20.306,-20.306l0,-24.125c0,-6.412 2.494,-12.572 6.953,-17.178c6.884,-7.11 17.23,-17.796 23.166,-23.927c1.214,-1.254 2.885,-1.962 4.631,-1.962c1.745,0 3.416,0.708 4.63,1.962c5.936,6.131 16.282,16.817 23.166,23.927c4.46,4.606 6.953,10.766 6.953,17.178c0,6.746 0,15.888 0,24.125Z"
                class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.dPadDown }" />
            <path d="M168.337,445.073l18.658,0l-9.081,9.08l-9.577,-9.08Z" class="ds-filled-icon" />
        </g>
        <g id="dpad-right">
            <path
                d="M263.75,322.259c11.215,0 20.306,9.091 20.306,20.306l-0,28.888c-0,11.214 -9.091,20.305 -20.306,20.305l-24.349,0c-6.278,0 -12.32,-2.391 -16.899,-6.687c-7.081,-6.644 -17.749,-16.654 -23.907,-22.433c-1.274,-1.195 -2.008,-2.855 -2.035,-4.601c-0.027,-1.746 0.656,-3.428 1.892,-4.661c6.106,-6.094 16.81,-16.778 23.946,-23.901c4.63,-4.621 10.905,-7.216 17.446,-7.216c6.724,0 15.758,0 23.906,0Z"
                class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.dPadRight }" />
            <path d="M265.73,367.409l0,-18.657l9.081,9.08l-9.081,9.577Z" class="ds-filled-icon" />
        </g>
        <g id="dpad-left">
            <path
                d="M93.725,322.259c-11.214,0 -20.306,9.091 -20.306,20.306l0,28.888c0,11.214 9.092,20.305 20.306,20.305l24.349,0c6.278,0 12.321,-2.391 16.899,-6.687c7.081,-6.644 17.749,-16.654 23.908,-22.433c1.273,-1.195 2.007,-2.855 2.034,-4.601c0.027,-1.746 -0.656,-3.428 -1.891,-4.661c-6.106,-6.094 -16.81,-16.778 -23.947,-23.901c-4.63,-4.621 -10.904,-7.216 -17.446,-7.216c-6.724,0 -15.757,0 -23.906,0Z"
                class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.dPadLeft }" />
            <path d="M91.745,367.409l0,-18.657l-9.08,9.08l9.08,9.577Z" class="ds-filled-icon" />
        </g>
        <circle id="cross" cx="934.079" cy="428.08" r="34.957" class="ds-stroke-normal"
            :class="{ 'ds-active': state.buttons.cross }" />
        <circle id="square" cx="864.079" cy="358.08" r="34.957" class="ds-stroke-normal"
            :class="{ 'ds-active': state.buttons.square }" />
        <circle id="circle" cx="1004.08" cy="358.08" r="34.957" class="ds-stroke-normal"
            :class="{ 'ds-active': state.buttons.circle }" />
        <circle id="triangle" cx="934.079" cy="288.08" r="34.957" class="ds-stroke-normal"
            :class="{ 'ds-active': state.buttons.triangle }" />
        <path d="M917.682,411.683l32.795,32.795m-0,-32.795l-32.795,32.795" class="ds-stroke-icon" />
        <rect x="847.313" y="341.648" width="32.865" height="32.865" class="ds-stroke-icon" />
        <path d="M934.079,271.403l20.206,33.355l-40.411,-0l20.205,-33.355Z" class="ds-stroke-icon" />
        <circle cx="1004.08" cy="358.08" r="19.1" class="ds-stroke-icon" />
        <path id="border1"
            d="M100.97,881.749c8.551,1.607 62.356,4.094 68.38,-3.153c33.93,-40.827 69.521,-154.237 85.416,-196.14c9.791,-25.813 35.4,-37.881 67.491,-40.687c30.597,13.569 45.149,13.982 96.708,3.594l280.228,-0c51.559,10.388 66.111,9.975 96.708,-3.594c32.091,2.806 57.701,14.874 67.492,40.687c15.894,41.903 51.486,155.313 85.416,196.14c6.023,7.247 59.828,4.76 68.38,3.153"
            class="ds-stroke-normal" />
        <path id="border2" d="M282.527,168.559c13.841,1.794 27.682,-1.16 41.522,-6.511" class="ds-stroke-normal" />
        <path id="mute"
            d="M590.061,591.266c-0,-3.699 -2.999,-6.698 -6.698,-6.698c-11.914,0 -36.653,0 -48.567,0c-3.7,0 -6.698,2.999 -6.698,6.698c-0,0.001 -0,0.001 -0,0.002c-0,3.699 2.998,6.698 6.698,6.698c11.914,-0 36.653,-0 48.567,-0c3.699,-0 6.698,-2.999 6.698,-6.698c-0,-0.001 -0,-0.001 -0,-0.002Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.mute }" />
        <path id="border3" d="M835.33,168.559c-13.84,1.794 -27.681,-1.16 -41.522,-6.511" class="ds-stroke-normal" />
        <path id="right-hat"
            d="M820.718,193.129c5.479,-25.983 25.744,-37.755 62.283,-33.901c40.742,4.297 79.814,11.918 115.424,22.309c11.905,3.474 23.486,8.273 28.39,18.67c91.01,192.963 106.846,408.796 55.912,643.084c-2.947,13.555 -9.046,24.221 -21.05,32.104c-5.842,3.836 -12.586,7.06 -21.885,9.445c-21.563,5.529 -31.041,-9.866 -33.637,-23.758c-33.415,-178.821 -88.678,-342.348 -191.662,-450.233c-9.318,-9.761 -18.181,-31.681 -20.635,-51.733c-0.97,-7.926 -0.451,-15.333 0.462,-22.036c6.052,-44.414 16.477,-96.901 26.398,-143.951Z"
            class="ds-stroke-normal" />
        <path id="left-hat"
            d="M296.668,193.129c-5.479,-25.983 -25.743,-37.755 -62.282,-33.901c-40.742,4.297 -79.814,11.918 -115.424,22.309c-11.905,3.474 -23.487,8.273 -28.39,18.67c-91.01,192.963 -106.846,408.796 -55.913,643.084c2.947,13.555 9.046,24.221 21.05,32.104c5.843,3.836 12.587,7.06 21.886,9.445c21.562,5.529 31.041,-9.866 33.636,-23.758c33.416,-178.821 88.679,-342.348 191.663,-450.233c9.318,-9.761 18.181,-31.681 20.635,-51.733c0.969,-7.926 0.451,-15.333 -0.463,-22.036c-6.051,-44.414 -16.477,-96.901 -26.398,-143.951Z"
            class="ds-stroke-normal" />
        <g id="touchpadgroup" ref="TouchpadGroupRef">
            <path id="touchpad"
                d="M559.079,143.015c0,0 158.534,-0.805 226.555,15.497c12.437,2.981 21.237,14.507 19.467,24.644c-8.942,51.221 -20.354,109.033 -30.53,160.023c-8.029,40.224 -40.893,53.816 -68.431,53.692c-27.538,-0.124 -147.061,-0.559 -147.061,-0.559c0,0 -119.522,0.435 -147.06,0.559c-27.538,0.124 -60.403,-13.468 -68.431,-53.692c-10.177,-50.99 -21.589,-108.802 -30.531,-160.023c-1.77,-10.137 7.031,-21.663 19.467,-24.644c68.021,-16.302 226.555,-15.497 226.555,-15.497Z"
                class="ds-stroke-normal" :class="{ 'ds-touchpad-active': state.buttons.touchPadClick }" />
            <circle v-for="touch of state.touchpad.touches" :key="touch.touchId" r="19" class="ds-filled-icon"
                :cx="getTouchPointX(touch.x)" :cy="getTouchPointY(touch.y)" />
        </g>
        <path id="r1"
            d="M995.675,180.421c-0.736,-29.244 -151.654,-71.59 -148.099,-18.465c9.518,-3.397 21.562,-4.367 36.227,-2.82c39.392,4.154 77.223,11.417 111.872,21.285Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.r1 }" />
        <path id="l1"
            d="M122.514,180.513c0.736,-29.244 151.654,-71.59 148.099,-18.465c-9.518,-3.397 -21.562,-4.367 -36.227,-2.82c-39.392,4.154 -77.223,11.417 -111.872,21.285Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.l1 }" />
        <path id="options"
            d="M839.082,206.321l-6.369,31.916c-0,-0 -2.557,11.875 11.724,14.725c14.281,2.849 16.478,-9.098 16.478,-9.098l6.4,-32.075c0,-0 2.559,-11.876 -11.74,-14.645c-14.298,-2.77 -16.493,9.177 -16.493,9.177Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.options }" />
        <path id="create"
            d="M281.064,206.321l6.369,31.916c-0,-0 2.557,11.875 -11.724,14.725c-14.281,2.849 -16.478,-9.098 -16.478,-9.098l-6.4,-32.075c-0,-0 -2.559,-11.876 11.739,-14.645c14.299,-2.77 16.494,9.177 16.494,9.177Z"
            class="ds-stroke-normal" :class="{ 'ds-active': state.buttons.create }" />
        <g id="create-icon">
            <path d="M262.694,188.058l-4.528,-7.079l4.528,7.079Z" class="ds-stroke-normal" />
            <path d="M269.717,185.341l-0,-8.725l-0,8.725Z" class="ds-stroke-normal" />
            <path d="M275.535,188.058l5.186,-7.079" class="ds-stroke-normal" />
        </g>
        <g id="options-icon">
            <path d="M856.893,174.616l-13.987,0l13.987,0Z" class="ds-stroke-normal" />
            <path d="M856.893,180.337l-13.987,0l13.987,0Z" class="ds-stroke-normal" />
            <path d="M856.893,186.058l-13.987,-0" class="ds-stroke-normal" />
        </g>
        <g id="r3group">
            <circle id="r3-border" cx="763.456" cy="528.548" r="87.347" class="ds-stroke-normal" />
            <circle id="r3" cx="763.456" cy="528.548" r="57.193" class="ds-stroke-normal ds-stick"
                :class="{ 'ds-active': state.buttons.r3 }" :style="{
                    transform: `translate(${getStickPoint(state.axes.rightStickX)}px, ${getStickPoint(state.axes.rightStickY)}px)`
                }" />
        </g>
        <g id="l3group">
            <circle id="l3-border" cx="351.764" cy="528.548" r="87.347" class="ds-stroke-normal" />
            <circle id="l3" cx="351.764" cy="528.548" r="57.193" class="ds-stroke-normal ds-stick"
                :class="{ 'ds-active': state.buttons.l3 }" :style="{
                    transform: `translate(${getStickPoint(state.axes.leftStickX)}px, ${getStickPoint(state.axes.leftStickY)}px)`
                }" />
        </g>
        <path id="ps"
            d="M525.1,538.049c-6.333,-1.817 -7.382,-5.56 -4.509,-7.734c2.071,-1.361 4.45,-2.545 6.969,-3.436l0.232,-0.072l18.72,-6.713l-0,7.71l-13.419,4.906c-2.351,0.905 -2.751,2.108 -0.798,2.754c0.974,0.248 2.089,0.392 3.239,0.392c1.641,-0 3.212,-0.291 4.666,-0.822l-0.094,0.029l6.462,-2.353l-0,6.915c-0.4,0.099 -0.854,0.147 -1.299,0.243c-2.068,0.363 -4.448,0.571 -6.875,0.571c-4.744,0 -9.3,-0.795 -13.547,-2.257l0.293,0.088l-0.04,-0.221Zm39.449,0.789l20.99,-7.584c2.383,-0.859 2.753,-2.084 0.819,-2.727c-0.968,-0.237 -2.078,-0.373 -3.222,-0.373c-1.66,-0 -3.255,0.288 -4.733,0.813l0.099,-0.029l-14.02,5l0,-7.958l0.801,-0.283c2.801,-0.931 6.093,-1.654 9.489,-2.03l0.221,-0.022c1.249,-0.133 2.695,-0.208 4.16,-0.208c5.007,0 9.809,0.883 14.254,2.505l-0.288,-0.093c6.16,2.003 6.8,4.906 5.252,6.907c-1.491,1.486 -3.294,2.662 -5.303,3.42l-0.104,0.035l-28.484,10.359l-0,-7.654l0.069,-0.078Zm-15.521,-54.146l-0,58.498l13.051,4.204l-0,-49.061c-0,-2.3 1.013,-3.836 2.646,-3.303c2.121,0.601 2.534,2.713 2.534,5.018l0,19.587c8.137,3.978 14.543,-0.008 14.543,-10.508c-0,-10.791 -3.754,-15.585 -14.796,-19.427c-4.762,-1.729 -10.778,-3.452 -16.933,-4.815l-1.037,-0.193l-0.008,0Z"
            class="ds-ps-icon" :class="{ 'ds-active': state.buttons.playStation }" />
    </svg>
</template>

<style scoped lang="scss">
svg {
    @apply w-full;

    #touchpadgroup {
        @apply relative;

        circle {
            @apply absolute;
        }
    }

    .ds-stroke-icon {
        @apply stroke-4px stroke-black/50 dark-stroke-white/50 fill-none;
    }

    .ds-filled-icon {
        @apply fill-black/50 dark-fill-white/50;
    }

    .ds-stroke-normal {
        @apply stroke-4px stroke-black/80 dark-stroke-white/80 fill-none;
    }

    .ds-ps-icon {
        @apply fill-black/20 dark-fill-white/20;
    }

    .ds-stick {
        @apply fill-white dark-fill-black;
    }

    .ds-active {
        @apply fill-primary stroke-primary;
    }

    .ds-touchpad-active {
        @apply stroke-primary;
    }
}
</style>
