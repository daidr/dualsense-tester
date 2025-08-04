<script setup lang="ts">
import type { ModelProps } from '@/device-based-router/shared'
import { computed } from 'vue'
import { useConnectionType, useInputReport } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { DPadDirection } from '@/utils/dualsense/ds.type'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util'

defineProps<ModelProps>()

const inputReport = useInputReport()
const connectionType = useConnectionType()

const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth,
)
const digitalKeys = computed(() => {
  const keys = inputReport.value.getInt8(offset.value.digitalKeys)
  const keys1 = inputReport.value.getInt8(offset.value.digitalKeys + 1)
  const keys2 = inputReport.value.getInt8(offset.value.digitalKeys + 2)
  return {
    triangle: (keys & 128) !== 0,
    circle: (keys & 64) !== 0,
    cross: (keys & 32) !== 0,
    square: (keys & 16) !== 0,
    option: (keys1 & 32) !== 0,
    create: (keys1 & 16) !== 0,
    r1: (keys1 & 2) !== 0,
    l1: (keys1 & 1) !== 0,
    mic: (keys2 & 4) !== 0,
    touchpad: (keys2 & 2) !== 0,
  }
})

const dpad = computed(() => {
  const direction = inputReport.value.getInt8(offset.value.digitalKeys) & 15
  const up = direction === DPadDirection.U || direction === DPadDirection.UR || direction === DPadDirection.UL
  const right = direction === DPadDirection.R || direction === DPadDirection.UR || direction === DPadDirection.RD
  const down = direction === DPadDirection.D || direction === DPadDirection.RD || direction === DPadDirection.LD
  const left = direction === DPadDirection.L || direction === DPadDirection.UL || direction === DPadDirection.LD
  return { up, right, down, left }
})

const triggerL = computed(() => inputReport.value.getUint8(offset.value.analogTriggerL))
const triggerR = computed(() => inputReport.value.getUint8(offset.value.analogTriggerR))
</script>

<template>
  <g>
    <path
      id="r2"
      d="M866.471,116.785l114.214,0c12.312,0 -1.248,-110.916 -78.919,-110.916c-37.32,-0 -51.81,110.916 -35.295,110.916Z"
      class="ds-active" :opacity="triggerR / 0xFF"
    />
    <text v-if="showValue" x="990" y="30" font-size="25" class="ds-text" text-anchor="middle">
      {{
        triggerR
      }}
    </text>
  </g>
  <g>
    <path
      id="l2"
      d="M252.212,116.785l-114.214,0c-12.312,0 1.248,-110.916 78.919,-110.916c37.32,-0 51.81,110.916 35.295,110.916Z"
      class="ds-active" :opacity="triggerL / 0xFF"
    />
    <text v-if="showValue" x="130" y="30" font-size="25" class="ds-text" text-anchor="middle">
      {{
        triggerL
      }}
    </text>
  </g>
  <path
    v-if="dpad.up"
    d="M213.487,271.996c0,-11.214 -9.091,-20.305 -20.305,-20.305l-28.888,-0c-11.215,-0 -20.306,9.091 -20.306,20.305l0,24.336c0,6.286 2.397,12.335 6.703,16.915c6.856,7.293 17.331,18.436 23.351,24.838c1.218,1.296 2.917,2.031 4.696,2.031c1.778,-0 3.478,-0.735 4.696,-2.031c6.019,-6.402 16.494,-17.545 23.35,-24.838c4.306,-4.58 6.703,-10.629 6.703,-16.915c0,-6.766 0,-16.013 0,-24.336Z"
    class="ds-active"
  />
  <path
    v-if="dpad.down"
    d="M213.487,443.093c0,11.215 -9.091,20.306 -20.305,20.306l-28.888,-0c-11.215,-0 -20.306,-9.091 -20.306,-20.306l0,-24.125c0,-6.412 2.494,-12.572 6.953,-17.178c6.884,-7.11 17.23,-17.796 23.166,-23.927c1.214,-1.254 2.885,-1.962 4.631,-1.962c1.745,0 3.416,0.708 4.63,1.962c5.936,6.131 16.282,16.817 23.166,23.927c4.46,4.606 6.953,10.766 6.953,17.178c0,6.746 0,15.888 0,24.125Z"
    class="ds-active"
  />
  <path
    v-if="dpad.right"
    d="M263.75,322.259c11.215,0 20.306,9.091 20.306,20.306l-0,28.888c-0,11.214 -9.091,20.305 -20.306,20.305l-24.349,0c-6.278,0 -12.32,-2.391 -16.899,-6.687c-7.081,-6.644 -17.749,-16.654 -23.907,-22.433c-1.274,-1.195 -2.008,-2.855 -2.035,-4.601c-0.027,-1.746 0.656,-3.428 1.892,-4.661c6.106,-6.094 16.81,-16.778 23.946,-23.901c4.63,-4.621 10.905,-7.216 17.446,-7.216c6.724,0 15.758,0 23.906,0Z"
    class="ds-active"
  />
  <path
    v-if="dpad.left"
    d="M93.725,322.259c-11.214,0 -20.306,9.091 -20.306,20.306l0,28.888c0,11.214 9.092,20.305 20.306,20.305l24.349,0c6.278,0 12.321,-2.391 16.899,-6.687c7.081,-6.644 17.749,-16.654 23.908,-22.433c1.273,-1.195 2.007,-2.855 2.034,-4.601c0.027,-1.746 -0.656,-3.428 -1.891,-4.661c-6.106,-6.094 -16.81,-16.778 -23.947,-23.901c-4.63,-4.621 -10.904,-7.216 -17.446,-7.216c-6.724,0 -15.757,0 -23.906,0Z"
    class="ds-active"
  />
  <path
    v-if="digitalKeys.touchpad" id="touchpad"
    d="M559.079,143.015c0,0 158.534,-0.805 226.555,15.497c12.437,2.981 21.237,14.507 19.467,24.644c-8.942,51.221 -20.354,109.033 -30.53,160.023c-8.029,40.224 -40.893,53.816 -68.431,53.692c-27.538,-0.124 -147.061,-0.559 -147.061,-0.559c0,0 -119.522,0.435 -147.06,0.559c-27.538,0.124 -60.403,-13.468 -68.431,-53.692c-10.177,-50.99 -21.589,-108.802 -30.531,-160.023c-1.77,-10.137 7.031,-21.663 19.467,-24.644c68.021,-16.302 226.555,-15.497 226.555,-15.497Z"
    class="ds-active"
  />
  <circle v-if="digitalKeys.cross" id="cross" cx="934.079" cy="428.08" r="34.957" class="ds-active" />
  <circle v-if="digitalKeys.square" id="square" cx="864.079" cy="358.08" r="34.957" class="ds-active" />
  <circle v-if="digitalKeys.circle" id="circle" cx="1004.08" cy="358.08" r="34.957" class="ds-active" />
  <circle v-if="digitalKeys.triangle" id="triangle" cx="934.079" cy="288.08" r="34.957" class="ds-active" />
  <path
    v-if="digitalKeys.mic" id="mute"
    d="M590.061,591.266c-0,-3.699 -2.999,-6.698 -6.698,-6.698c-11.914,0 -36.653,0 -48.567,0c-3.7,0 -6.698,2.999 -6.698,6.698c-0,0.001 -0,0.001 -0,0.002c-0,3.699 2.998,6.698 6.698,6.698c11.914,-0 36.653,-0 48.567,-0c3.699,-0 6.698,-2.999 6.698,-6.698c-0,-0.001 -0,-0.001 -0,-0.002Z"
    class="ds-active"
  />
  <path
    v-if="digitalKeys.r1" id="r1"
    d="M995.675,180.421c-0.736,-29.244 -151.654,-71.59 -148.099,-18.465c9.518,-3.397 21.562,-4.367 36.227,-2.82c39.392,4.154 77.223,11.417 111.872,21.285Z"
    class="ds-active"
  />
  <path
    v-if="digitalKeys.l1" id="l1"
    d="M122.514,180.513c0.736,-29.244 151.654,-71.59 148.099,-18.465c-9.518,-3.397 -21.562,-4.367 -36.227,-2.82c-39.392,4.154 -77.223,11.417 -111.872,21.285Z"
    class="ds-active"
  />
  <path
    v-if="digitalKeys.option" id="options"
    d="M839.082,206.321l-6.369,31.916c-0,-0 -2.557,11.875 11.724,14.725c14.281,2.849 16.478,-9.098 16.478,-9.098l6.4,-32.075c0,-0 2.559,-11.876 -11.74,-14.645c-14.298,-2.77 -16.493,9.177 -16.493,9.177Z"
    class="ds-active"
  />
  <path
    v-if="digitalKeys.create" id="create"
    d="M281.064,206.321l6.369,31.916c-0,-0 2.557,11.875 -11.724,14.725c-14.281,2.849 -16.478,-9.098 -16.478,-9.098l-6.4,-32.075c-0,-0 -2.559,-11.876 11.739,-14.645c14.299,-2.77 16.494,9.177 16.494,9.177Z"
    class="ds-active"
  />
</template>

<style scoped lang="scss">
.ds-active {
  @apply important-fill-primary important-stroke-primary;
}

.ds-text {
  @apply fill-black dark-fill-white;
  @apply font-mono select-none;
}
</style>
