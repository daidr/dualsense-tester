<script setup lang="ts">
import type { TelemetryData } from '@/utils/dualsense/telemetry.util'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useDevice } from '@/composables/useInjectValues'
import { fetchTelemetry, formatDuration } from '@/utils/dualsense/telemetry.util'
import { hidLogger } from '@/utils/logger.util'

const props = defineProps<{ isEdge: boolean }>()

const deviceItem = useDevice()

const loading = ref(false)
const loaded = ref(false)
const telemetry = shallowRef<TelemetryData | null>(null)
const activeTimeSeconds = ref<number | null>(null)

type FieldType = 'count' | 'duration' | 'text'
interface Field { key: string, type: FieldType }

function f(key: string, type: FieldType = 'count'): Field {
  return { key, type }
}

// 部分按键配图标：PS 符号与肩键用 fancy-controller 图标集，方向键用 mingcute 箭头。
const FIELD_ICONS: Record<string, string> = {
  buttonDPadUp: 'i-mingcute-arrow-up-line',
  buttonDPadDown: 'i-mingcute-arrow-down-line',
  buttonDPadLeft: 'i-mingcute-arrow-left-line',
  buttonDPadRight: 'i-mingcute-arrow-right-line',
  buttonTriangle: 'i-fancy-controller-triangle-solid',
  buttonCircle: 'i-fancy-controller-circle-solid',
  buttonCross: 'i-fancy-controller-x-solid',
  buttonSquare: 'i-fancy-controller-square-solid',
  buttonL1: 'i-fancy-controller-l1-solid',
  buttonL2: 'i-fancy-controller-l2-solid',
  buttonL3: 'i-fancy-controller-l3-solid',
  buttonR1: 'i-fancy-controller-r1-solid',
  buttonR2: 'i-fancy-controller-r2-solid',
  buttonR3: 'i-fancy-controller-r3-solid',
  buttonL2ShortStroke: 'i-fancy-controller-l2-solid',
  buttonL2MiddleStroke: 'i-fancy-controller-l2-solid',
  buttonL2FullStroke: 'i-fancy-controller-l2-solid',
  buttonR2ShortStroke: 'i-fancy-controller-r2-solid',
  buttonR2MiddleStroke: 'i-fancy-controller-r2-solid',
  buttonR2FullStroke: 'i-fancy-controller-r2-solid',
  leftStickXRoundTripCount: 'i-fancy-controller-ls-solid',
  leftStickXDynamicRangeValue: 'i-fancy-controller-ls-solid',
  leftStickYRoundTripCount: 'i-fancy-controller-ls-solid',
  leftStickYDynamicRangeValue: 'i-fancy-controller-ls-solid',
  rightStickXRoundTripCount: 'i-fancy-controller-rs-solid',
  rightStickXDynamicRangeValue: 'i-fancy-controller-rs-solid',
  rightStickYRoundTripCount: 'i-fancy-controller-rs-solid',
  rightStickYDynamicRangeValue: 'i-fancy-controller-rs-solid',
}

const usageFields: Field[] = [
  f('totalRecordCount'),
  f('totalActiveTime', 'duration'),
  f('totalChargeTime', 'duration'),
  f('hapticDeviceActiveTime', 'duration'),
  f('adaptiveTriggerLeftActiveTime', 'duration'),
  f('adaptiveTriggerRightActiveTime', 'duration'),
]

const connectionFields: Field[] = [
  f('usbConnectCount'),
  f('bluetoothConnectCount'),
  f('bluetoothConnectTimeoutCount'),
  f('usbSdpDetectCount'),
  f('usbCdpDetectCount'),
  f('usbDcpDetectCount'),
  f('usbTypec15DetectCount'),
  f('usbTypec30DetectCount'),
  f('usbUnknownDetectCount'),
  f('batteryChargerConnectCount'),
  f('batteryChargeCount'),
  f('batteryFullChargeCount'),
  f('headsetDetectCount'),
  f('headphoneDetectCount'),
  f('batteryChargeVoltageErrorCount'),
  f('batteryChargeTemperatureErrorCount'),
  f('batteryChargePmicErrorCount'),
  f('subcpuStartupErrorCount'),
  f('authChallengeCount'),
  f('authSuccessCount'),
  f('authFailCount'),
]

const standardButtonFields: Field[] = [
  'buttonDPadUp',
  'buttonDPadDown',
  'buttonDPadLeft',
  'buttonDPadRight',
  'buttonTriangle',
  'buttonCross',
  'buttonSquare',
  'buttonCircle',
  'buttonL1',
  'buttonL2',
  'buttonL3',
  'buttonR1',
  'buttonR2',
  'buttonR3',
  'touchpadTouchDetect',
  'touchpadPress',
  'buttonOption',
  'buttonCreate',
  'buttonPs',
  'buttonMute',
].map(k => f(k))

const edgeButtonFields: Field[] = [
  'buttonDPadUp',
  'buttonDPadDown',
  'buttonDPadLeft',
  'buttonDPadRight',
  'buttonTriangle',
  'buttonCross',
  'buttonSquare',
  'buttonCircle',
  'buttonL1',
  'buttonL2ShortStroke',
  'buttonL2MiddleStroke',
  'buttonL2FullStroke',
  'buttonR1',
  'buttonR2ShortStroke',
  'buttonR2MiddleStroke',
  'buttonR2FullStroke',
  'touchpadTouchDetect',
  'touchpadPress',
  'buttonOption',
  'buttonCreate',
  'buttonPs',
  'buttonMute',
  'buttonBackLeft',
  'buttonBackRight',
].map(k => f(k))

const standardStickFields: Field[] = [
  'leftStickXRoundTripCount',
  'leftStickXDynamicRangeValue',
  'leftStickYRoundTripCount',
  'leftStickYDynamicRangeValue',
  'rightStickXRoundTripCount',
  'rightStickXDynamicRangeValue',
  'rightStickYRoundTripCount',
  'rightStickYDynamicRangeValue',
].map(k => f(k))

const edgeStickFields: Field[] = [
  f('stickModuleLeftSerialNumber', 'text'),
  f('stickModuleLeftXRoundTripCount'),
  f('stickModuleLeftXDynamicRangeValue'),
  f('stickModuleLeftYRoundTripCount'),
  f('stickModuleLeftYDynamicRangeValue'),
  f('stickModuleLeftButtonPressCount'),
  f('stickModuleLeftFunctionButtonPressCount'),
  f('stickModuleRightSerialNumber', 'text'),
  f('stickModuleRightXRoundTripCount'),
  f('stickModuleRightXDynamicRangeValue'),
  f('stickModuleRightYRoundTripCount'),
  f('stickModuleRightYDynamicRangeValue'),
  f('stickModuleRightButtonPressCount'),
  f('stickModuleRightFunctionButtonPressCount'),
]

const UPPERCASE_RE = /[A-Z]/g

function toSnake(key: string): string {
  return key.replace(UPPERCASE_RE, m => `_${m.toLowerCase()}`)
}

function formatValue(field: Field): string | null {
  const data = telemetry.value
  if (!data) {
    return null
  }
  const value = data[field.key]
  if (value === undefined) {
    return null
  }
  if (field.type === 'duration') {
    return formatDuration(value as number)
  }
  if (field.type === 'text') {
    return String(value) || null
  }
  return String(value)
}

const resolvedGroups = computed(() => {
  if (!telemetry.value) {
    return []
  }
  // 按键组项多且 label/值短，用两列栅格更紧凑；其余组 label 或值较长，保持单列。
  const defs: { title: string, fields: Field[], cols: number }[] = [
    { title: 'group_usage', fields: usageFields, cols: 1 },
    { title: 'group_connection', fields: connectionFields, cols: 2 },
    { title: 'group_buttons', fields: props.isEdge ? edgeButtonFields : standardButtonFields, cols: 2 },
    { title: 'group_sticks', fields: props.isEdge ? edgeStickFields : standardStickFields, cols: props.isEdge ? 1 : 2 },
  ]
  return defs
    .map(group => ({
      title: `connect_panel.diagnostics.${group.title}`,
      cols: group.cols,
      items: group.fields
        .map(field => ({ key: field.key, label: `connect_panel.diagnostics.${toSnake(field.key)}`, icon: FIELD_ICONS[field.key], value: formatValue(field) }))
        .filter((item): item is { key: string, label: string, icon: string | undefined, value: string } => item.value !== null),
    }))
    .filter(group => group.items.length)
})

async function load() {
  if (loading.value || !deviceItem.value) {
    return
  }
  loading.value = true
  try {
    const result = await fetchTelemetry(deviceItem.value, props.isEdge)
    telemetry.value = result.telemetry ?? null
    activeTimeSeconds.value = result.activeTimeSeconds ?? null
  }
  catch (error) {
    hidLogger.error('telemetry load failed', error)
    telemetry.value = null
    activeTimeSeconds.value = null
  }
  finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)
</script>

<template>
  <div class="diagnostics">
    <div v-if="loading" class="loading">
      <span class="i-mingcute-loading-fill animate-spin" />
    </div>

    <template v-else-if="telemetry">
      <div v-for="group in resolvedGroups" :key="group.title" class="group">
        <div class="group-title">
          {{ $t(group.title) }}
        </div>
        <div class="grid gap-x-4" :class="group.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'">
          <div v-for="item in group.items" :key="item.key" class="cell">
            <span class="cell-label">
              <span v-if="item.icon" class="cell-icon" :class="item.icon" />
              {{ $t(item.label) }}
            </span>
            <span class="cell-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="activeTimeSeconds !== null">
      <p class="hint">
        {{ $t('connect_panel.diagnostics.partial_hint') }}
      </p>
      <div class="cell">
        <span class="cell-label">{{ $t('connect_panel.diagnostics.total_active_time') }}</span>
        <span class="cell-value">{{ formatDuration(activeTimeSeconds) }}</span>
      </div>
    </template>

    <p v-else-if="loaded" class="hint">
      {{ $t('connect_panel.diagnostics.unsupported') }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.diagnostics {
  @apply flex flex-col gap-3;
}

.loading {
  @apply flex items-center justify-center py-4 text-xl text-primary;
}

.group {
  @apply flex flex-col;
}

.group-title {
  @apply text-primary font-bold text-sm mb-1;
}

.cell {
  @apply flex justify-between gap-2 rounded-lg px-1 text-sm transform-gpu;

  &:hover {
    @apply bg-primary/10 dark-bg-primary/30;
  }
}

.cell-label {
  @apply flex items-center gap-1 shrink-0 font-bold select-none;
}

.cell-icon {
  @apply text-base text-primary shrink-0;
}

.cell-value {
  @apply text-end font-mono opacity-80 break-all;
}

.hint {
  @apply text-xs text-gray-500 dark-text-gray-400;
}
</style>
