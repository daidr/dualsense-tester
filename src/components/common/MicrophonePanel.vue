<script setup lang="ts">
import { AnimatePresence, m } from 'motion-v'
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DouButton from '@/components/base/DouButton.vue'
import DouSelect from '@/components/base/DouSelect.vue'
import { useDualSenseMicrophone } from '@/composables/useDualSenseMicrophone'
import { useConnectionType, useDevice } from '@/composables/useInjectValues'
import { useToast } from '@/composables/useToast'
import { connectionTypeToString, DeviceConnectionType } from '@/device-based-router/shared'
import SpectrumView from './SpectrumView.vue'

const INPUT_UNSELECTED = '__input_unselected__'

const { t } = useI18n()
const toast = useToast()
const device = useDevice()
const connectionType = useConnectionType()
const microphone = useDualSenseMicrophone({ device })

const isUsb = computed(() => connectionType.value === DeviceConnectionType.USB)
const transportLabel = computed(() =>
  connectionType.value ? connectionTypeToString(connectionType.value) : '',
)
const spectrumActive = computed(() => microphone.isCapturing.value || microphone.isPlaying.value)
const statusLocaleKey = computed(() => {
  if (!microphone.isCapturing.value) {
    return 'microphone_panel.idle'
  }
  return microphone.isMuted.value ? 'microphone_panel.muted' : 'microphone_panel.listening'
})

const inputOptions = computed(() => [
  {
    value: INPUT_UNSELECTED,
    label: t('microphone_panel.select_input_device'),
    disabled: true,
  },
  ...microphone.inputDevices.value.map((input, index) => ({
    value: input.deviceId,
    label: input.label || t('microphone_panel.input_generic', { n: index + 1 }),
  })),
])

const inputModel = computed({
  get: () => microphone.selectedInputId.value ?? INPUT_UNSELECTED,
  set: (value: string) => {
    if (value !== INPUT_UNSELECTED) {
      microphone.selectedInputId.value = value
    }
  },
})

const errorMessages = {
  'permission-denied': 'microphone_panel.error_permission_denied',
  'input-device-required': 'microphone_panel.error_input_device_required',
  'input-unavailable': 'microphone_panel.error_input_unavailable',
  'bluetooth-codec-unsupported': 'microphone_panel.error_bluetooth_codec_unsupported',
  'bluetooth-stream-failed': 'microphone_panel.error_bluetooth_stream_failed',
  'recording-unsupported': 'microphone_panel.error_recording_unsupported',
  'recording-failed': 'microphone_panel.error_recording_failed',
  'playback-failed': 'microphone_panel.error_playback_failed',
} as const

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

async function toggleCapture() {
  if (microphone.isCapturing.value) {
    await microphone.stopCapture()
  }
  else {
    await microphone.startCapture()
  }
}

async function toggleRecording() {
  if (microphone.isRecording.value) {
    await microphone.stopRecording()
  }
  else {
    microphone.startRecording()
  }
}

async function togglePlayback() {
  if (microphone.isPlaying.value) {
    microphone.pausePlayback()
  }
  else {
    await microphone.playRecording()
  }
}

watch(microphone.error, (value) => {
  if (value) {
    toast.error({ content: t(errorMessages[value]), duration: 6000 })
  }
})

onMounted(() => {
  if (isUsb.value) {
    void microphone.refreshInputDevices()
  }
})
</script>

<template>
  <div class="microphone-panel">
    <div class="status-row">
      <span class="i-mingcute-mic-line text-lg" />
      <div class="status-copy">
        <span class="status-title">{{ $t('microphone_panel.live_input') }}</span>
        <span class="status-detail">{{ transportLabel }} · 48 kHz</span>
      </div>
      <span
        class="status-dot"
        :class="{ active: microphone.isCapturing.value, muted: microphone.isMuted.value }"
      />
      <span class="status-text">
        {{ $t(statusLocaleKey) }}
      </span>
    </div>

    <div v-if="isUsb" class="input-section">
      <span class="field-label">{{ $t('microphone_panel.input_device') }}</span>
      <div class="input-controls">
        <DouSelect
          v-model="inputModel"
          :options="inputOptions"
          :disabled="microphone.isCapturing.value"
          :label="$t('microphone_panel.input_device')"
        />
        <button
          v-if="!microphone.hasNamedInputs()"
          type="button"
          class="grant-btn"
          :disabled="microphone.isCapturing.value"
          @click="microphone.requestDeviceAccess"
        >
          {{ $t('microphone_panel.allow_device_access') }}
        </button>
      </div>
      <p v-if="!microphone.hasNamedInputs()" class="hint">
        {{ $t('microphone_panel.device_access_hint') }}
      </p>
    </div>

    <div class="action-row">
      <DouButton :disabled="microphone.isStarting.value" @click="toggleCapture">
        <span :class="microphone.isCapturing.value ? 'i-mingcute-stop-circle-line' : 'i-mingcute-mic-line'" />
        {{ $t(microphone.isCapturing.value ? 'microphone_panel.stop_listening' : 'microphone_panel.start_listening') }}
      </DouButton>
      <DouButton
        :disabled="!microphone.isCapturing.value && !microphone.isRecording.value"
        @click="toggleRecording"
      >
        <span :class="microphone.isRecording.value ? 'i-mingcute-stop-fill' : 'i-mingcute-record-circle-line'" />
        {{ $t(microphone.isRecording.value ? 'microphone_panel.stop_recording' : 'microphone_panel.start_recording') }}
      </DouButton>
      <span v-if="microphone.isRecording.value" class="recording-time">
        <span class="recording-dot" />
        {{ formatTime(microphone.recordingDuration.value) }}
      </span>
    </div>

    <div v-if="microphone.hasRecording.value" class="recording-row">
      <button
        type="button"
        class="playback-button"
        :aria-label="$t(microphone.isPlaying.value ? 'microphone_panel.pause' : 'microphone_panel.play')"
        @click="togglePlayback"
      >
        <span :class="microphone.isPlaying.value ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill'" />
      </button>
      <div class="recording-copy">
        <span class="recording-title">{{ $t('microphone_panel.latest_recording') }}</span>
        <span class="recording-duration">
          {{ formatTime(microphone.playbackTime.value) }} / {{ formatTime(microphone.recordingDuration.value) }}
        </span>
      </div>
      <button
        type="button"
        class="delete-button"
        :aria-label="$t('microphone_panel.delete_recording')"
        @click="microphone.clearRecording"
      >
        <span class="i-mingcute-delete-2-line" />
      </button>
    </div>

    <AnimatePresence :initial="false">
      <m.div
        v-if="spectrumActive"
        class="spectrum-wrap"
        :initial="{ height: 0, opacity: 0 }"
        :animate="{ height: 'auto', opacity: 1 }"
        :exit="{ height: 0, opacity: 0 }"
        :transition="{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }"
      >
        <SpectrumView :analyser="microphone.analyser.value" :active="spectrumActive" />
      </m.div>
    </AnimatePresence>
  </div>
</template>

<style scoped lang="scss">
.microphone-panel {
  @apply flex flex-col gap-3 w-full min-w-0;
}

.status-row {
  @apply flex items-center gap-2 text-primary;
}

.status-copy {
  @apply flex flex-col flex-1 min-w-0;
}

.status-title {
  @apply text-sm font-bold;
}

.status-detail,
.status-text,
.recording-duration {
  @apply text-xs text-primary/55;
}

.status-dot,
.recording-dot {
  @apply block rounded-full bg-gray-400;
}

.status-dot {
  @apply w-2 h-2;

  &.active {
    @apply bg-green-500 shadow-sm shadow-green-500/60;
  }

  &.muted {
    @apply bg-red-500 shadow-red-500/60;
  }
}

.input-section {
  @apply flex flex-col gap-1.5 py-3 border-y border-gray-3 dark-border-gray-6;
}

.input-controls {
  @apply flex flex-wrap items-center gap-2 min-w-0;

  :deep(.select-wrapper) {
    @apply min-w-48 max-w-full;

    .label {
      @apply truncate;
    }
  }
}

.field-label {
  @apply text-xs text-primary/70;
}

.grant-btn {
  @apply shrink-0 text-xs text-primary px-2 py-0.5 rounded-full cursor-pointer;
  @apply dou-sc-colorborder transition active-bg-primary active-text-white disabled:cursor-not-allowed disabled:opacity-50;
}

.spectrum-wrap {
  @apply overflow-hidden;
}

.action-row {
  @apply flex flex-wrap items-center gap-2;
}

.recording-time {
  @apply flex items-center gap-1 font-mono text-xs text-red-500 tabular-nums;
}

.recording-dot {
  @apply w-1.5 h-1.5 bg-red-500 animate-pulse;
}

.recording-row {
  @apply flex items-center gap-2 p-2 rounded-xl bg-primary/5 text-primary;
}

.playback-button,
.delete-button {
  @apply flex items-center justify-center rounded-full transition cursor-pointer;
  @apply active-bg-primary active-text-white;
}

.playback-button {
  @apply w-8 h-8 text-lg dou-sc-colorborder;
}

.delete-button {
  @apply w-7 h-7 text-base text-primary/60;
}

.recording-copy {
  @apply flex flex-col flex-1 min-w-0;
}

.recording-title {
  @apply text-sm font-medium;
}

.hint {
  @apply text-xs text-primary/55 leading-snug;
}
</style>
