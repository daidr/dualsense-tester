<script setup lang="ts">
import { useConnectionType, useInputReport, useInputReportId } from '@/composables/useInjectValues'
import { DeviceConnectionType, type ModelProps } from '@/device-based-router/shared'
import { DPadDirection } from '@/utils/dualsense/ds.type'
import { computed } from 'vue'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../../_utils/offset.util'

defineProps<ModelProps>()

const inputReport = useInputReport()
const inputReportId = useInputReportId()
const connectionType = useConnectionType()

const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB || inputReportId.value === 0x01 ? inputReportOffsetUSB : inputReportOffsetBluetooth,
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
    share: (keys1 & 16) !== 0,
    r1: (keys1 & 2) !== 0,
    l1: (keys1 & 1) !== 0,
    touchpad: (keys2 & 2) !== 0,
    ps: (keys2 & 1) !== 0,
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
  <g id="Background" class="ds-fill-primary">
    <path
      v-if="digitalKeys.square" id="Active_Square"
      d="M933.901 475.663c-20.779 0-37.687-16.913-37.687-37.705 0-20.779 16.908-37.687 37.687-37.687 20.783 0 37.696 16.908 37.696 37.687 0 20.792-16.913 37.705-37.696 37.705"
    />
    <path
      v-if="digitalKeys.triangle" id="Active_Triangle"
      d="M1019.84 389.806c-20.78 0-37.688-16.908-37.688-37.691 0-20.784 16.908-37.692 37.688-37.692 20.783 0 37.695 16.908 37.695 37.692 0 20.783-16.912 37.691-37.695 37.691"
    />
    <path
      v-if="digitalKeys.circle" id="Active_Circle"
      d="M1105.06 475.943c-20.779 0-37.688-16.912-37.688-37.704 0-20.779 16.909-37.687 37.688-37.687 20.783 0 37.696 16.908 37.696 37.687 0 20.792-16.913 37.704-37.696 37.704"
    />
    <path
      v-if="digitalKeys.cross" id="Active_Cross"
      d="M1019.83 561.055c-20.779 0-37.687-16.913-37.687-37.696 0-20.779 16.908-37.688 37.687-37.688 20.784 0 37.696 16.909 37.696 37.688 0 20.783-16.912 37.696-37.696 37.696"
    />
    <path
      v-if="digitalKeys.ps" id="Active_PS"
      d="M655.898 627.876c-15.796 0-28.646-12.745-28.646-28.416 0-15.667 12.85-28.413 28.646-28.413 15.788 0 28.629 12.746 28.629 28.413 0 15.671-12.841 28.416-28.629 28.416"
    />
    <path
      v-if="digitalKeys.share" id="Active_Share"
      d="M418.365 356.227c-10.158 0-18.425-8.266-18.425-18.425V305.59c0-10.163 8.267-18.429 18.425-18.429 10.159 0 18.425 8.266 18.425 18.429v32.212c0 10.159-8.266 18.425-18.425 18.425"
    />
    <path
      v-if="digitalKeys.option" id="Active_Options"
      d="M893.683 356.227c-10.159 0-18.425-8.266-18.425-18.425V305.59c0-10.163 8.266-18.429 18.425-18.429 10.162 0 18.433 8.266 18.433 18.429v32.212c0 10.159-8.271 18.425-18.433 18.425"
    />
    <g>
      <path
        id="Active_RT" :opacity="triggerR / 255"
        d="M955.312 175.277c.032 11.11 134.184 24.923 135.161 12.489 3.545-45.152-3.954-88.354-16.895-109.341-10.109-16.393-33.932-37.075-61.425-24.486-30.192 13.826-56.973 76.547-56.841 121.338Z"
      />
      <text v-if="showValue" x="1100" y="60" font-size="25" class="ds-text" text-anchor="middle">
        {{
          triggerR
        }}
      </text>
    </g>
    <g>
      <path
        id="Active_LT" :opacity="triggerL / 255"
        d="M356.35 175.277c-.032 11.11-134.184 24.923-135.161 12.489-3.545-45.152 3.954-88.354 16.895-109.341 10.109-16.393 33.931-37.075 61.425-24.486 30.192 13.826 56.973 76.547 56.841 121.338Z"
      />
      <text v-if="showValue" x="200" y="60" font-size="25" class="ds-text" text-anchor="middle">
        {{
          triggerL
        }}
      </text>
    </g>
    <path
      v-if="dpad.up" id="Active_DPadTop"
      d="M293.806 424.22c-5.875 0-9.417-3.692-9.567-3.85-.629-.637-15.975-16.112-18.158-18.683-3.046-3.584-4.021-8.45-4.063-8.654-.033-.375-2.096-25.955-2.608-30.963-.608-6.012 1.125-10.558 5.617-14.742 6.3-5.883 19.125-7.12 28.779-7.12 9.65 0 22.479 1.237 28.779 7.12 4.483 4.188 6.212 8.734 5.604 14.742-.512 5.008-2.562 30.588-2.583 30.846-.059.325-1.038 5.187-4.075 8.771-2.184 2.571-17.538 18.046-18.192 18.704-.125.137-3.667 3.829-9.533 3.829"
    />
    <path
      v-if="dpad.right" id="Active_DPadRight"
      d="M371.882 471.979c-.742 0-1.496-.041-2.263-.121-5.008-.512-30.587-2.566-30.845-2.587-.321-.058-5.192-1.033-8.775-4.071-2.567-2.192-18.042-17.533-18.7-18.187-.138-.125-3.83-3.667-3.83-9.542 0-5.871 3.692-9.417 3.85-9.567.638-.629 16.113-15.975 18.675-18.158 3.584-3.038 8.455-4.021 8.663-4.058.375-.038 25.954-2.096 30.962-2.605 5.796-.604 10.542 1.105 14.742 5.609 5.883 6.3 7.117 19.125 7.117 28.779 0 9.65-1.234 22.475-7.117 28.783-3.646 3.904-7.608 5.725-12.479 5.725"
    />
    <path
      v-if="dpad.down" id="Active_DPadBottom"
      d="M293.805 535.04c-9.654 0-22.483-1.233-28.779-7.112-4.488-4.188-6.221-8.738-5.613-14.746.513-5.004 2.571-30.588 2.592-30.846.054-.321 1.029-5.183 4.079-8.771 2.179-2.571 17.525-18.042 18.175-18.704.129-.133 3.671-3.829 9.546-3.829 5.867 0 9.408 3.696 9.554 3.85.633.641 15.988 16.112 18.167 18.687 3.041 3.584 4.025 8.446 4.062 8.65.038.375 2.088 25.959 2.6 30.959.609 6.012-1.121 10.558-5.604 14.75-6.296 5.879-19.125 7.112-28.779 7.112"
    />
    <path
      v-if="dpad.left" id="Active_DPadLeft"
      d="M215.725 472.286c-4.867 0-8.833-1.816-12.483-5.725-5.884-6.316-7.117-19.133-7.117-28.779s1.233-22.466 7.112-28.779c4.209-4.508 8.95-6.208 14.755-5.608 5 .512 30.579 2.566 30.837 2.587.321.059 5.192 1.034 8.775 4.071 2.575 2.183 18.046 17.533 18.708 18.188.134.125 3.821 3.666 3.821 9.541 0 5.871-3.687 9.413-3.841 9.563-.642.633-16.113 15.975-18.684 18.162-3.587 3.042-8.458 4.017-8.662 4.059-.375.033-25.954 2.091-30.954 2.604-.771.079-1.525.116-2.267.116"
    />
    <path
      v-if="digitalKeys.r1" id="Active_R1"
      d="M940.98 244.208v-13.68c0-2.987 3.129-4.591 3.263-4.658.258-.129 26.741-13.158 71.829-13.158 34.662 0 72.967 21.291 73.287 21.508 1.88 1.254 2.48 3.738 2.505 3.842l.025 10.187c-43.734-4.75-93.667-6.289-150.909-4.041Z"
    />
    <path
      v-if="digitalKeys.l1" id="Active_L1"
      d="M220.155 248.249v-9.95c.054-.346.667-2.825 2.538-4.079.325-.217 38.479-21.508 73.283-21.508 45.088 0 71.571 13.029 71.833 13.158.13.067 3.267 1.671 3.267 4.658v13.68c-67.903-2.593-117.093-.995-150.921 4.041Z"
    />
    <path
      v-if="digitalKeys.touchpad" id="Active_TouchPad"
      d="M820.042 469.996H492.559c-22 0-22.784-22.75-22.792-22.984V253.321c0-.346 373.058-.346 373.058 0V447c-.004.246-.779 22.996-22.783 22.996"
    />
  </g>
</template>

<style scoped lang="scss">
.ds-fill-primary {
  @apply fill-primary;
}

.ds-fill {
  @apply fill-black dark-fill-white;
}

.ds-text {
  @apply fill-black dark-fill-white;
  @apply font-mono select-none;
}
</style>
