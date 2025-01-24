<script setup lang="ts">
import { useConnectionType, useInputReport } from '@/composables/useInjectValues';
import { DeviceConnectionType, type ModelProps } from '@/device-based-router/shared';
import { numberToXHex } from '@/utils/format.util';
import { computed } from 'vue';
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../utils/offset.util';
import { normalizeThumbStickAxis } from '@/device-based-router/utils/ds.util';

const props = defineProps<ModelProps>()

const inputReport = useInputReport()
const connectionType = useConnectionType()

const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth
)
const digitalKeys = computed(() => {
  const keys1 = inputReport.value.getInt8(offset.value.digitalKeys + 1)
  const keys2 = inputReport.value.getInt8(offset.value.digitalKeys + 2)
  return {
    r3: (keys1 & 128) !== 0,
    l3: (keys1 & 64) !== 0,
    ps: (keys2 & 1) !== 0,
  }
})

const stickL = computed(() => ({
  x: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickLX)),
  y: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickLY))
}))
const stickR = computed(() => ({
  x: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickRX)),
  y: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickRY))
}))

const tpPoint1 = computed(() => {
  const id = inputReport.value.getUint8(offset.value.touchData)
  const x = ((inputReport.value.getUint8(offset.value.touchData + 2) & 15) << 8) | (inputReport.value.getUint8(offset.value.touchData + 1))
  const y = (inputReport.value.getUint8(offset.value.touchData + 3) << 4) | (inputReport.value.getUint8(offset.value.touchData + 2) >> 4)

  return { x, y, id }
})

const tpPoint2 = computed(() => {
  const id = inputReport.value.getUint8(offset.value.touchData + 4)
  const x = ((inputReport.value.getUint8(offset.value.touchData + 6) & 15) << 8) | (inputReport.value.getUint8(offset.value.touchData + 5))
  const y = (inputReport.value.getUint8(offset.value.touchData + 7) << 4) | (inputReport.value.getUint8(offset.value.touchData + 6) >> 4)

  return { x, y, id }
})

const TOUCHPAD_LEFT = 340
const TOUCHPAD_TOP = 160
const TOUCHPAD_REAL_WIDTH = 430
const TOUCHPAD_REAL_HEIGHT = 235

const TOUCHPAD_RANGE_X = 1920
const TOUCHPAD_RANGE_Y = 1080

const TOUCHPAD_XF = TOUCHPAD_REAL_WIDTH / TOUCHPAD_RANGE_X
const TOUCHPAD_YF = TOUCHPAD_REAL_HEIGHT / TOUCHPAD_RANGE_Y

const getTouchPointX = (x: number) => {
  return x * TOUCHPAD_XF + TOUCHPAD_LEFT
}

const getTouchPointY = (y: number) => {
  return y * TOUCHPAD_YF + TOUCHPAD_TOP
}

const STICK_REAL_RADIUS = 86

const getStickPoint = (x: number) => {
  return STICK_REAL_RADIUS * x
}

function showTouchPoint(id: number) {
  if (props.showValue) {
    return true
  }

  return id < 128
}

const tpPointStyle1 = computed(() => {
  return {
    transform: `translate(${getTouchPointX(tpPoint1.value.x)}px, ${getTouchPointY(tpPoint1.value.y)}px)`
  }
})

const tpPointStyle2 = computed(() => {
  return {
    transform: `translate(${getTouchPointX(tpPoint2.value.x)}px, ${getTouchPointY(tpPoint2.value.y)}px)`
  }
})

const rightStickStyle = computed(() => {
  return {
    transform: `translate(${getStickPoint(stickR.value.x ?? 0)}px, ${getStickPoint(stickR.value.y ?? 0)}px)`
  }
})

const leftStickStyle = computed(() => {
  return {
    transform: `translate(${getStickPoint(stickL.value.x ?? 0)}px, ${getStickPoint(stickL.value.y ?? 0)}px)`
  }
})

function formatStickValue(value: number) {
  const result = value.toPrecision(9).slice(0, 9)
  return value < 0 ? result : `\u00A0${result}`
}
</script>

<template>
  <rect v-if="showValue" x="340" y="160" width="430" height="235" class="ds-stroke-dashed" />
  <g v-if="showTouchPoint(tpPoint1.id)" :style="tpPointStyle1">
    <circle r="19" class="ds-filled-icon" :cx="0" :cy="0" />
    <text x="0" y="40" font-size="25" class="ds-text" text-anchor="middle">{{
      numberToXHex(tpPoint1.id, 2) }}</text>
    <text x="0" y="-25" font-size="25" class="ds-text" text-anchor="middle">{{
      tpPoint1.x }},{{
        tpPoint1.y }}</text>
  </g>
  <g v-if="showTouchPoint(tpPoint2.id)" :style="tpPointStyle2">
    <circle r="19" class="ds-filled-icon" :cx="0" :cy="0" />
    <text x="0" y="40" font-size="25" class="ds-text" text-anchor="middle">{{
      numberToXHex(tpPoint2.id, 2) }}</text>
    <text x="0" y="-25" font-size="25" class="ds-text" text-anchor="middle">{{
      tpPoint2.x }},{{
        tpPoint2.y }}</text>
  </g>
  <g id="r3group">
    <g :style="rightStickStyle">
      <circle id="r3" cx="763.456" cy="528.548" r="57.193" class="ds-stroke-normal"
        :class="{ 'ds-stick-active': digitalKeys.r3 }" />
      <!-- central point -->
      <circle v-if="showValue" cx="763.456" cy="528.548" r="2" class="ds-fill-red" />
    </g>

    <text v-if="showValue" x="850" y="700" font-size="25" class="ds-text" text-anchor="end">{{
      formatStickValue(stickR.x) }} X</text>
    <text v-if="showValue" x="850" y="730" font-size="25" class="ds-text" text-anchor="end">{{
      formatStickValue(stickR.y) }} Y</text>
    <!-- cross line -->
    <line v-if="showValue" x2="763.456" y2="441.355" x1="763.456" y1="615.741" class="ds-stroke-dashed" />
    <line v-if="showValue" x2="676.263" y2="528.548" x1="850.649" y1="528.548" class="ds-stroke-dashed" />
  </g>
  <g id="l3group">
    <g :style="leftStickStyle">
      <circle id="l3" cx="351.764" cy="528.548" r="57.193" class="ds-stroke-normal"
        :class="{ 'ds-stick-active': digitalKeys.l3 }" />
      <!-- central point -->
      <circle v-if="showValue" cx="351.764" cy="528.548" r="2" class="ds-fill-red" />
    </g>

    <text v-if="showValue" x="270" y="700" font-size="25" class="ds-text">X {{
      formatStickValue(stickL.x) }}</text>
    <text v-if="showValue" x="270" y="730" font-size="25" class="ds-text">Y {{
      formatStickValue(stickL.y) }}</text>
    <!-- cross line -->
    <line v-if="showValue" x2="351.764" y2="441.355" x1="351.764" y1="615.741" class="ds-stroke-dashed" />
    <line v-if="showValue" x2="264.571" y2="528.548" x1="438.957" y1="528.548" class="ds-stroke-dashed" />
  </g>
  <path id="ps"
    d="M525.1,538.049c-6.333,-1.817 -7.382,-5.56 -4.509,-7.734c2.071,-1.361 4.45,-2.545 6.969,-3.436l0.232,-0.072l18.72,-6.713l-0,7.71l-13.419,4.906c-2.351,0.905 -2.751,2.108 -0.798,2.754c0.974,0.248 2.089,0.392 3.239,0.392c1.641,-0 3.212,-0.291 4.666,-0.822l-0.094,0.029l6.462,-2.353l-0,6.915c-0.4,0.099 -0.854,0.147 -1.299,0.243c-2.068,0.363 -4.448,0.571 -6.875,0.571c-4.744,0 -9.3,-0.795 -13.547,-2.257l0.293,0.088l-0.04,-0.221Zm39.449,0.789l20.99,-7.584c2.383,-0.859 2.753,-2.084 0.819,-2.727c-0.968,-0.237 -2.078,-0.373 -3.222,-0.373c-1.66,-0 -3.255,0.288 -4.733,0.813l0.099,-0.029l-14.02,5l0,-7.958l0.801,-0.283c2.801,-0.931 6.093,-1.654 9.489,-2.03l0.221,-0.022c1.249,-0.133 2.695,-0.208 4.16,-0.208c5.007,0 9.809,0.883 14.254,2.505l-0.288,-0.093c6.16,2.003 6.8,4.906 5.252,6.907c-1.491,1.486 -3.294,2.662 -5.303,3.42l-0.104,0.035l-28.484,10.359l-0,-7.654l0.069,-0.078Zm-15.521,-54.146l-0,58.498l13.051,4.204l-0,-49.061c-0,-2.3 1.013,-3.836 2.646,-3.303c2.121,0.601 2.534,2.713 2.534,5.018l0,19.587c8.137,3.978 14.543,-0.008 14.543,-10.508c-0,-10.791 -3.754,-15.585 -14.796,-19.427c-4.762,-1.729 -10.778,-3.452 -16.933,-4.815l-1.037,-0.193l-0.008,0Z"
    class="ds-ps-icon" :class="{ 'ds-active': digitalKeys.ps }" />
</template>

<style scoped lang="scss">
.ds-filled-icon {
  @apply fill-black/50 dark-fill-white/50;
}

.ds-text {
  @apply fill-black dark-fill-white;
  @apply font-mono select-none;
}

.ds-stroke-normal {
  @apply stroke-2px stroke-black/80 dark-stroke-white/80 fill-white/50 dark-fill-black/50;
}

.ds-stick-active {
  @apply stroke-2px stroke-black/80 dark-stroke-white/80 fill-primary/50;
}

.ds-fill-red {
  @apply fill-red-700;
}

.ds-stroke-dashed {
  @apply stroke-2px stroke-black/50 dark-stroke-white/50 fill-none;
  stroke-dasharray: 5;
}

.ds-ps-icon {
  @apply fill-black/20 dark-fill-white/20;
}

.ds-active {
  @apply important-fill-primary important-stroke-primary;
}
</style>
