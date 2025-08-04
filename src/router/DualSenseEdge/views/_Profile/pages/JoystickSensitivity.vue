<script setup lang="ts">
import type { DSEJoystickProfile, DSEProfile } from '../profile'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onDocumentUnload } from '@/composables/onDocumentUnload'
import { useConnectionType, useDevice, useInputReport } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { sendOutputReportFactory } from '@/utils/dualsense/ds.util'
import { createAsyncLock } from '@/utils/lock.util'
import { DSEJoystickCurveMap } from '../profile'
import JoystickPreview from './JoystickSensitivity/JoystickPreview.vue'

const props = defineProps<{
  profile: DSEProfile
}>()

const enterOutputReport = new Uint8Array(63)
const leaveOutputReport = new Uint8Array(63)
enterOutputReport[38] = leaveOutputReport[38] = 0x80
const initialized = ref(false)

function createNewEnterReport(side: 'left' | 'right', joystickProfile?: DSEJoystickProfile) {
  const newReport = enterOutputReport.slice()
  if (side === 'left') {
    newReport[40] = 0x01
  }
  else {
    newReport[40] = 0x02
  }
  if (!joystickProfile) {
    return newReport
  }
  const { preset, curvePoints } = joystickProfile
  newReport[49] = DSEJoystickCurveMap[preset].curveParams.pointCount
  for (let i = 0; i < curvePoints.length; i++) {
    newReport[50 + i] = curvePoints[i] ?? 0x00
  }
  return newReport
}

const device = useDevice()
const _sendOutputReport = computed(() => {
  return sendOutputReportFactory(device.value)
})
const outputReportLock = createAsyncLock()
async function sendOutputReport(reportData: Uint8Array) {
  await outputReportLock(async () => {
    await _sendOutputReport.value(reportData)
  })
}

const currentSide = ref<'left' | 'right'>('left')

const leftJoystick = computed({
  get: () => {
    return props.profile.leftJoystick
  },
  set: (val) => {
    props.profile.leftJoystick = val
    currentSide.value = 'left'
  },
})

const rightJoystick = computed({
  get: () => {
    return props.profile.rightJoystick
  },
  set: (val) => {
    props.profile.rightJoystick = val
    currentSide.value = 'right'
  },
})

function normalizeThumbStickAxis(value: number) {
  return (2 * value) / 0xFF - 1.0
}

const inputReport = useInputReport()
const connectionType = useConnectionType()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? 0 : 1,
)

const currentJoystickPreview = computed(() => {
  return {
    leftX: normalizeThumbStickAxis(inputReport.value.getUint8(15 + offset.value)),
    leftY: normalizeThumbStickAxis(inputReport.value.getUint8(16 + offset.value)),
    rightX: normalizeThumbStickAxis(inputReport.value.getUint8(17 + offset.value)),
    rightY: normalizeThumbStickAxis(inputReport.value.getUint8(18 + offset.value)),
    finalLeftX: normalizeThumbStickAxis(inputReport.value.getUint8(19 + offset.value)),
    finalLeftY: normalizeThumbStickAxis(inputReport.value.getUint8(20 + offset.value)),
    finalRightX: normalizeThumbStickAxis(inputReport.value.getUint8(21 + offset.value)),
    finalRightY: normalizeThumbStickAxis(inputReport.value.getUint8(22 + offset.value)),
  }
})

const currentJoystickOffset = computed(() => {
  return {
    left: Math.hypot(currentJoystickPreview.value.leftX, currentJoystickPreview.value.leftY),
    right: Math.hypot(currentJoystickPreview.value.rightX, currentJoystickPreview.value.rightY),
    // finalLeft: Math.hypot(currentJoystickPreview.value.finalLeftX, currentJoystickPreview.value.finalLeftY),
    // finalRight: Math.hypot(currentJoystickPreview.value.finalRightX, currentJoystickPreview.value.finalRightY),
  }
})

watch(() => currentJoystickOffset.value, (value, oldValue) => {
  if (oldValue.left < 0.3 && value.left >= 0.3) {
    currentSide.value = 'left'
  }
  else if (oldValue.right < 0.3 && value.right >= 0.3) {
    currentSide.value = 'right'
  }
})

watch(() => [currentSide.value, leftJoystick.value, rightJoystick.value] as const, ([currentSide, leftJoystick, rightJoystick]) => {
  sendEnterReport(currentSide, currentSide === 'left' ? leftJoystick : rightJoystick)
})

function sendEnterReport(side: 'left' | 'right', joystickProfile?: DSEJoystickProfile) {
  const report = createNewEnterReport(side, joystickProfile)
  return sendOutputReport(report)
}

onMounted(() => {
  sendOutputReport(enterOutputReport)
  sendEnterReport(currentSide.value, currentSide.value === 'left' ? leftJoystick.value : rightJoystick.value).then(() => {
    nextTick(() => {
      initialized.value = true
    })
  })

  function dispose() {
    sendOutputReport(leaveOutputReport)
  }

  onBeforeUnmount(() => {
    dispose()
  })

  onDocumentUnload(() => {
    dispose()
  })
})
</script>

<template>
  <div v-if="initialized" class="flex flex-col gap-10">
    <div class="flex flex-col gap-2">
      <label class="title">{{ $t('profile_mode.left_joystick') }}</label>
      <JoystickPreview
        v-model="leftJoystick" :current="currentJoystickOffset.left" :x="currentJoystickPreview.leftX"
        :y="currentJoystickPreview.leftY" :final-x="currentJoystickPreview.finalLeftX"
        :final-y="currentJoystickPreview.finalLeftY"
      />
    </div>
    <div class="flex flex-col gap-2">
      <label class="title">{{ $t('profile_mode.right_joystick') }}</label>
      <JoystickPreview
        v-model="rightJoystick" :current="currentJoystickOffset.right" :x="currentJoystickPreview.rightX"
        :y="currentJoystickPreview.rightY" :final-x="currentJoystickPreview.finalRightX"
        :final-y="currentJoystickPreview.finalRightY"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.title {
  @apply text-base font-bold;
}
</style>
