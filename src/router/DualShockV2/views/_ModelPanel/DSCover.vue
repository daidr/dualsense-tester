<script setup lang="ts">
import { useConnectionType, useInputReport, useInputReportId } from '@/composables/useInjectValues'
import { DeviceConnectionType, type ModelProps } from '@/device-based-router/shared'
import { normalizeThumbStickAxis } from '@/utils/dualsense/ds.util'
import { numberToXHex } from '@/utils/format.util'
import { computed } from 'vue'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util'

const props = defineProps<ModelProps>()

const inputReport = useInputReport()
const inputReportId = useInputReportId()
const connectionType = useConnectionType()

const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB || inputReportId.value === 0x01 ? inputReportOffsetUSB : inputReportOffsetBluetooth,
)
const digitalKeys = computed(() => {
  const keys1 = inputReport.value.getInt8(offset.value.digitalKeys + 1)
  return {
    r3: (keys1 & 128) !== 0,
    l3: (keys1 & 64) !== 0,
  }
})

const stickL = computed(() => ({
  x: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickLX)),
  y: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickLY)),
}))
const stickR = computed(() => ({
  x: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickRX)),
  y: normalizeThumbStickAxis(inputReport.value.getUint8(offset.value.analogStickRY)),
}))

const tpPoint1 = computed(() => {
  let id = inputReport.value.getUint8(offset.value.touchData)
  const x = ((inputReport.value.getUint8(offset.value.touchData + 2) & 15) << 8) | (inputReport.value.getUint8(offset.value.touchData + 1))
  const y = (inputReport.value.getUint8(offset.value.touchData + 3) << 4) | (inputReport.value.getUint8(offset.value.touchData + 2) >> 4)
  if (connectionType.value === DeviceConnectionType.Bluetooth && inputReportId.value === 0x01) {
    id = 255
  }
  return { x, y, id }
})

const tpPoint2 = computed(() => {
  let id = inputReport.value.getUint8(offset.value.touchData + 4)
  const x = ((inputReport.value.getUint8(offset.value.touchData + 6) & 15) << 8) | (inputReport.value.getUint8(offset.value.touchData + 5))
  const y = (inputReport.value.getUint8(offset.value.touchData + 7) << 4) | (inputReport.value.getUint8(offset.value.touchData + 6) >> 4)
  if (connectionType.value === DeviceConnectionType.Bluetooth && inputReportId.value === 0x01) {
    id = 255
  }

  return { x, y, id }
})

const TOUCHPAD_LEFT = 472
const TOUCHPAD_TOP = 298
const TOUCHPAD_REAL_WIDTH = 370
const TOUCHPAD_REAL_HEIGHT = 170

const TOUCHPAD_RANGE_X = 1920
const TOUCHPAD_RANGE_Y = 942

const TOUCHPAD_XF = TOUCHPAD_REAL_WIDTH / TOUCHPAD_RANGE_X
const TOUCHPAD_YF = TOUCHPAD_REAL_HEIGHT / TOUCHPAD_RANGE_Y

const STICK_REAL_RADIUS = 102
const STICK_RIGHT_X = 842.093
const STICK_RIGHT_Y = 596.31
const STICK_LEFT_X = 470.098
const STICK_LEFT_Y = 596.421

function getTouchPointX(x: number) {
  return x * TOUCHPAD_XF + TOUCHPAD_LEFT
}

function getTouchPointY(y: number) {
  return y * TOUCHPAD_YF + TOUCHPAD_TOP
}

function getStickPoint(x: number) {
  return STICK_REAL_RADIUS * x
}

function showTouchPoint(id: number) {
  return id < 128
}

const tpPointStyle1 = computed(() => {
  return {
    transform: `translate(${getTouchPointX(tpPoint1.value.x)}px, ${getTouchPointY(tpPoint1.value.y)}px)`,
  }
})

const tpPointStyle2 = computed(() => {
  return {
    transform: `translate(${getTouchPointX(tpPoint2.value.x)}px, ${getTouchPointY(tpPoint2.value.y)}px)`,
  }
})

const rightStickStyle = computed(() => {
  return {
    transform: `translate(${getStickPoint(stickR.value.x ?? 0)}px, ${getStickPoint(stickR.value.y ?? 0)}px)`,
  }
})

const leftStickStyle = computed(() => {
  return {
    transform: `translate(${getStickPoint(stickL.value.x ?? 0)}px, ${getStickPoint(stickL.value.y ?? 0)}px)`,
  }
})

function formatStickValue(value: number) {
  const result = value.toPrecision(9).slice(0, 9)
  return value < 0 ? result : `${result}`
}
</script>

<template>
  <rect
    v-if="showValue" :x="TOUCHPAD_LEFT" :y="TOUCHPAD_TOP" :width="TOUCHPAD_REAL_WIDTH"
    :height="TOUCHPAD_REAL_HEIGHT" class="ds-stroke-dashed"
  />
  <g v-if="showTouchPoint(tpPoint1.id)" :style="tpPointStyle1">
    <circle r="19" class="ds-filled-icon" :cx="0" :cy="0" />
    <text x="0" y="40" font-size="25" class="ds-text" text-anchor="middle">
      {{ numberToXHex(tpPoint1.id, 2) }}
    </text>
    <text x="0" y="-25" font-size="25" class="ds-text" text-anchor="middle">
      {{ tpPoint1.x }},{{ tpPoint1.y }}
    </text>
  </g>
  <g v-if="showTouchPoint(tpPoint2.id)" :style="tpPointStyle2">
    <circle r="19" class="ds-filled-icon" :cx="0" :cy="0" />
    <text x="0" y="40" font-size="25" class="ds-text" text-anchor="middle">
      {{ numberToXHex(tpPoint2.id, 2) }}
    </text>
    <text x="0" y="-25" font-size="25" class="ds-text" text-anchor="middle">
      {{ tpPoint2.x }},{{ tpPoint2.y }}
    </text>
  </g>
  <g id="r3group">
    <g :style="rightStickStyle">
      <circle
        id="Active_RS" :cx="STICK_RIGHT_X" :cy="STICK_RIGHT_Y" r="61.278" class="ds-stroke-normal"
        :class="{ 'ds-stick-active': digitalKeys.r3 }"
      />

      <!-- central point -->
      <circle v-if="showValue" :cx="STICK_RIGHT_X" :cy="STICK_RIGHT_Y" r="2" class="ds-fill-red" />
    </g>

    <text v-if="showValue" :x="STICK_RIGHT_X" y="760" font-size="25" class="ds-text" text-anchor="middle">
      X {{
        formatStickValue(stickR.x) }}
    </text>
    <text v-if="showValue" :x="STICK_RIGHT_X" y="790" font-size="25" class="ds-text" text-anchor="middle">
      Y {{
        formatStickValue(stickR.y) }}
    </text>
    <!-- cross line -->
    <line
      v-if="showValue" :x2="STICK_RIGHT_X - STICK_REAL_RADIUS" :y2="STICK_RIGHT_Y"
      :x1="STICK_RIGHT_X + STICK_REAL_RADIUS" :y1="STICK_RIGHT_Y" class="ds-stroke-dashed"
    />
    <line
      v-if="showValue" :x2="STICK_RIGHT_X" :y2="STICK_RIGHT_Y - STICK_REAL_RADIUS" :x1="STICK_RIGHT_X"
      :y1="STICK_RIGHT_Y + STICK_REAL_RADIUS" class="ds-stroke-dashed"
    />
  </g>
  <g id="l3group">
    <g :style="leftStickStyle">
      <circle
        id="Active_LS" :cx="STICK_LEFT_X" :cy="STICK_LEFT_Y" r="61.278" class="ds-stroke-normal"
        :class="{ 'ds-stick-active': digitalKeys.l3 }"
      />

      <!-- central point -->
      <circle v-if="showValue" :cx="STICK_LEFT_X" :cy="STICK_LEFT_Y" r="2" class="ds-fill-red" />
    </g>

    <text v-if="showValue" :x="STICK_LEFT_X" y="760" font-size="25" class="ds-text" text-anchor="middle">
      X {{
        formatStickValue(stickL.x) }}
    </text>
    <text v-if="showValue" :x="STICK_LEFT_X" y="790" font-size="25" class="ds-text" text-anchor="middle">
      Y {{
        formatStickValue(stickL.y) }}
    </text>
    <!-- cross line -->
    <line
      v-if="showValue" :x2="STICK_LEFT_X - STICK_REAL_RADIUS" :y2="STICK_LEFT_Y"
      :x1="STICK_LEFT_X + STICK_REAL_RADIUS" :y1="STICK_LEFT_Y" class="ds-stroke-dashed"
    />
    <line
      v-if="showValue" :x2="STICK_LEFT_X" :y2="STICK_LEFT_Y - STICK_REAL_RADIUS" :x1="STICK_LEFT_X"
      :y1="STICK_LEFT_Y + STICK_REAL_RADIUS" class="ds-stroke-dashed"
    />
  </g>
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
  @apply stroke-2px stroke-black/80 dark-stroke-white/80 fill-primary/50 dark-fill-primary/50;
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
