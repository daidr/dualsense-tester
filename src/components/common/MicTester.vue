<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { uiLogger } from '@/utils/logger.util'
import SliderBox from './SliderBox.vue'

const props = defineProps<{
  deviceName: string
  available: boolean
}>()

type RecordState = 'idle' | 'recording' | 'recorded' | 'playing'

const { t } = useI18n()
const toast = useToast()

const audioEl = useTemplateRef<HTMLAudioElement>('audioEl')

const state = ref<RecordState>('idle')
const duration = ref(0)
const currentTime = ref(0)
const volume = ref(1)
const muted = ref(false)

const LEVEL_SEGMENTS = 14
const level = ref(0)

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recordedUrl: string | null = null
let recordStartedAt = 0

let audioCtx: AudioContext | null = null
let micSource: MediaStreamAudioSourceNode | null = null
let micAnalyser: AnalyserNode | null = null
let micGain: GainNode | null = null
let elementSource: MediaElementAudioSourceNode | null = null
let elementAnalyser: AnalyserNode | null = null
let activeAnalyser: AnalyserNode | null = null
let levelBuffer: Uint8Array<ArrayBuffer> | null = null
let levelRaf = 0

const hasClip = computed(() => state.value === 'recorded' || state.value === 'playing')
const isRecording = computed(() => state.value === 'recording')
const isPlaying = computed(() => state.value === 'playing')
const effectiveVolume = computed(() => muted.value ? 0 : volume.value)
const litSegments = computed(() => Math.round(level.value * LEVEL_SEGMENTS))
const scrubMax = computed(() => duration.value || 1)
const scrubModel = computed({
  get: () => currentTime.value,
  set: seekTo,
})

watch(volume, () => {
  muted.value = false
})

watch(effectiveVolume, (value) => {
  if (audioEl.value) {
    audioEl.value.volume = value
  }
})

function reportError(error: unknown) {
  uiLogger.error(error)
  toast.error({ content: t('audio_panel.mic_record_error') })
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function labelMatchesName(label: string): boolean {
  const name = props.deviceName.toLowerCase()
  return !!name && label.toLowerCase().includes(name)
}

function labelMatchesGeneric(label: string): boolean {
  const l = label.toLowerCase()
  return l.includes('dualsense') || l.includes('wireless controller')
}

function releaseRecorder() {
  mediaRecorder?.stream.getTracks().forEach(track => track.stop())
  mediaRecorder = null
}

function revokeRecording() {
  if (recordedUrl) {
    URL.revokeObjectURL(recordedUrl)
    recordedUrl = null
  }
}

async function findControllerInput(): Promise<MediaDeviceInfo | undefined> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const inputs = devices.filter(device => device.kind === 'audioinput')
  return inputs.find(device => labelMatchesName(device.label))
    ?? inputs.find(device => labelMatchesGeneric(device.label))
}

function ensureContext(): AudioContext {
  audioCtx ??= new AudioContext()
  return audioCtx
}

function createAnalyser(ctx: AudioContext): AnalyserNode {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.7
  return analyser
}

function startLevelLoop() {
  if (levelRaf) {
    return
  }
  const tick = () => {
    const analyser = activeAnalyser
    if (!analyser) {
      levelRaf = 0
      return
    }
    if (!levelBuffer || levelBuffer.length !== analyser.fftSize) {
      levelBuffer = new Uint8Array(analyser.fftSize)
    }
    analyser.getByteTimeDomainData(levelBuffer)
    let sum = 0
    for (const sample of levelBuffer) {
      const centered = (sample - 128) / 128
      sum += centered * centered
    }
    const rms = Math.sqrt(sum / levelBuffer.length)
    level.value = Math.min(rms * 1.8, 1)
    levelRaf = requestAnimationFrame(tick)
  }
  levelRaf = requestAnimationFrame(tick)
}

function stopLevelLoop() {
  if (levelRaf) {
    cancelAnimationFrame(levelRaf)
    levelRaf = 0
  }
  activeAnalyser = null
  level.value = 0
}

function startInputMeter(stream: MediaStream) {
  try {
    const ctx = ensureContext()
    void ctx.resume()
    micSource = ctx.createMediaStreamSource(stream)
    micAnalyser = createAnalyser(ctx)
    micGain = ctx.createGain()
    micGain.gain.value = 0
    micSource.connect(micAnalyser)
    micAnalyser.connect(micGain)
    micGain.connect(ctx.destination)
    activeAnalyser = micAnalyser
    startLevelLoop()
  }
  catch (error) {
    uiLogger.warn('input metering unavailable', error)
  }
}

function stopInputMeter() {
  stopLevelLoop()
  micSource?.disconnect()
  micAnalyser?.disconnect()
  micGain?.disconnect()
  micSource = null
  micAnalyser = null
  micGain = null
}

function ensurePlaybackGraph(element: HTMLAudioElement): boolean {
  if (elementSource) {
    return true
  }
  try {
    const ctx = ensureContext()
    elementSource = ctx.createMediaElementSource(element)
    elementAnalyser = createAnalyser(ctx)
    elementSource.connect(elementAnalyser)
    elementAnalyser.connect(ctx.destination)
    return true
  }
  catch (error) {
    uiLogger.warn('output metering unavailable', error)
    return false
  }
}

function onRecordClick() {
  if (isPlaying.value) {
    return
  }
  if (isRecording.value) {
    finishRecording()
  }
  else {
    startRecording()
  }
}

async function startRecording() {
  let stream: MediaStream | null = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const controllerInput = await findControllerInput()
    if (!controllerInput) {
      stream.getTracks().forEach(track => track.stop())
      state.value = hasClip.value ? 'recorded' : 'idle'
      toast.warning({ content: t('audio_panel.mic_device_not_found') })
      return
    }

    const currentDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId
    if (currentDeviceId !== controllerInput.deviceId) {
      stream.getTracks().forEach(track => track.stop())
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: controllerInput.deviceId } },
      })
    }

    revokeRecording()
    audioChunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.start()
    startInputMeter(stream)
    recordStartedAt = performance.now()
    duration.value = 0
    currentTime.value = 0
    state.value = 'recording'
  }
  catch (error) {
    stream?.getTracks().forEach(track => track.stop())
    stopInputMeter()
    releaseRecorder()
    state.value = 'idle'
    reportError(error)
  }
}

async function finishRecording() {
  const recorder = mediaRecorder
  if (!recorder || recorder.state === 'inactive') {
    state.value = 'idle'
    return
  }

  try {
    const elapsed = (performance.now() - recordStartedAt) / 1000

    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true })
      recorder.stop()
    })
    releaseRecorder()
    stopInputMeter()

    if (audioChunks.length === 0) {
      state.value = 'idle'
      reportError(new Error('No audio data was recorded'))
      return
    }

    revokeRecording()
    recordedUrl = URL.createObjectURL(new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' }))
    if (audioEl.value) {
      audioEl.value.src = recordedUrl
      audioEl.value.load()
    }
    duration.value = elapsed
    currentTime.value = 0
    state.value = 'recorded'
  }
  catch (error) {
    releaseRecorder()
    stopInputMeter()
    state.value = hasClip.value ? 'recorded' : 'idle'
    reportError(error)
  }
}

async function togglePlay() {
  if (!hasClip.value) {
    return
  }
  const element = audioEl.value
  if (!element) {
    return
  }

  if (isPlaying.value) {
    element.pause()
    stopLevelLoop()
    state.value = 'recorded'
    return
  }

  try {
    const metered = ensurePlaybackGraph(element)
    if (metered) {
      await ensureContext().resume()
    }

    element.volume = effectiveVolume.value
    if (currentTime.value >= duration.value - 0.05) {
      element.currentTime = 0
      currentTime.value = 0
    }
    await element.play()

    if (metered && elementAnalyser) {
      activeAnalyser = elementAnalyser
      startLevelLoop()
    }
    state.value = 'playing'
  }
  catch (error) {
    stopLevelLoop()
    state.value = 'recorded'
    reportError(error)
  }
}

function seekTo(seconds: number) {
  if (!hasClip.value) {
    return
  }
  currentTime.value = seconds
  if (audioEl.value) {
    audioEl.value.currentTime = seconds
  }
}

function onTimeUpdate() {
  if (audioEl.value) {
    currentTime.value = audioEl.value.currentTime
  }
}

function onPlaybackEnded() {
  currentTime.value = duration.value
  stopLevelLoop()
  if (state.value === 'playing') {
    state.value = 'recorded'
  }
}

function toggleMute() {
  muted.value = !muted.value
}

onBeforeUnmount(() => {
  stopLevelLoop()
  micSource?.disconnect()
  elementSource?.disconnect()
  releaseRecorder()
  audioEl.value?.pause()
  revokeRecording()
  audioCtx?.close().catch(() => {})
  audioCtx = null
})
</script>

<template>
  <div class="mic-tester">
    <div class="mic-head">
      <span class="mic-title">{{ $t('audio_panel.mic_record_playback') }}</span>
      <button
        type="button" class="record-btn dou-sc-btn" :class="{ 'is-recording': isRecording }"
        :disabled="!available || isPlaying"
        :aria-pressed="isRecording"
        @click="onRecordClick"
      >
        <span v-if="isRecording" class="record-dot" />
        <span v-else class="i-mingcute-mic-fill text-sm" />
        {{ isRecording ? $t('shared.stop') : $t('audio_panel.mic_record') }}
      </button>
    </div>

    <p v-if="!available" class="mic-note">
      {{ $t('audio_panel.mic_usb_only') }}
    </p>

    <div v-else class="player">
      <div class="player-row" :class="{ 'is-disabled': !hasClip }" :aria-disabled="!hasClip">
        <button
          type="button" class="icon-btn play-btn" :disabled="!hasClip"
          :aria-label="isPlaying ? $t('shared.pause') : $t('shared.play')"
          @click="togglePlay"
        >
          <span :class="isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill'" />
        </button>

        <SliderBox
          v-model="scrubModel" class="scrub" :min="0" :max="scrubMax" :digits="2"
          :disabled="!hasClip" :aria-label="$t('audio_panel.mic_record_playback')"
        >
          <template #default="{ value }">
            {{ formatTime(value) }}
          </template>
        </SliderBox>

        <span class="time">
          <span class="time-now">{{ formatTime(currentTime) }}</span>
          <span class="time-sep">/</span>
          <span class="time-total">{{ formatTime(duration) }}</span>
        </span>
      </div>

      <div class="meter-row">
        <div
          class="level-meter" :class="{ 'is-active': isRecording || isPlaying }"
          role="meter" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(level * 100)"
          :aria-label="$t('audio_panel.mic_level')"
        >
          <span class="meter-label">
            <span class="i-mingcute-wave-line" />
            {{ $t('audio_panel.mic_level') }}
          </span>
          <div class="meter-bars">
            <span
              v-for="seg in LEVEL_SEGMENTS" :key="seg"
              class="seg" :class="{ lit: seg <= litSegments, clip: seg > LEVEL_SEGMENTS - 2 }"
            />
          </div>
        </div>

        <div class="volume-group" :class="{ 'is-disabled': !hasClip }">
          <button
            type="button" class="icon-btn vol-btn" :disabled="!hasClip"
            :aria-label="$t('audio_panel.mic_volume')"
            @click="toggleMute"
          >
            <span :class="effectiveVolume === 0 ? 'i-mingcute-volume-mute-line' : 'i-mingcute-volume-line'" />
          </button>

          <SliderBox
            v-model="volume" class="volume" :min="0" :max="1" :digits="2"
            :disabled="!hasClip" :aria-label="$t('audio_panel.mic_volume')"
          >
            <template #default="{ value }">
              {{ Math.round(value * 100) }}%
            </template>
          </SliderBox>
        </div>
      </div>
    </div>

    <audio
      ref="audioEl" class="hidden"
      @timeupdate="onTimeUpdate" @ended="onPlaybackEnded"
    />
  </div>
</template>

<style scoped lang="scss">
.mic-tester {
  @apply flex flex-col gap-2 w-full min-w-0;
}

.mic-head {
  @apply flex items-center justify-between gap-2 min-w-0;
}

.mic-title {
  @apply text-primary font-bold text-sm min-w-0 truncate;
}

.record-btn {
  @apply h-7 text-xs px-3 flex-shrink-0;

  &.is-recording {
    @apply bg-red-500 text-white border-red-500 hover:bg-red-500;
  }
}

.record-dot {
  @apply w-2.5 h-2.5 rounded-full bg-white;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.mic-note {
  @apply text-xs text-gray-500 dark-text-gray-400;
}

.player {
  @apply flex flex-col gap-3 w-full min-w-0;
  @apply dou-sc-colorborder rounded-2xl px-3 py-2.5;
}

.player-row {
  @apply flex items-center gap-3 min-w-0;
}

.meter-row {
  @apply flex items-center gap-2 min-w-0;
}

.volume-group {
  @apply flex items-center gap-2 flex-shrink-0;
}

.player-row,
.volume-group {
  @apply transition-opacity duration-200;

  &.is-disabled {
    @apply opacity-45;
  }
}

.icon-btn {
  @apply flex-shrink-0 flex items-center justify-center;
  @apply text-primary rounded-full transition;
  @apply hover:bg-primary/12 active:scale-90;

  &:disabled {
    @apply cursor-not-allowed;
  }
}

.play-btn {
  @apply w-8 h-8 text-xl text-white bg-primary;
  @apply hover:bg-primary/85;
}

.vol-btn {
  @apply w-5 h-5 text-sm;
}

.scrub {
  @apply flex-1 min-w-12;
}

.volume {
  @apply w-16 flex-shrink-0;
}

.level-meter {
  @apply flex flex-1 items-center gap-1.5 min-w-0 opacity-55 transition-opacity duration-200;

  &.is-active {
    @apply opacity-100;
  }
}

.meter-label {
  @apply flex items-center gap-1 flex-shrink-0;
  @apply font-mono text-[10px] uppercase tracking-wider text-primary/70;
}

.meter-bars {
  @apply flex items-center gap-0.5 flex-1 min-w-0 h-3;
}

.seg {
  @apply flex-1 h-full min-w-0 rounded-px bg-primary/12 transition-colors duration-75;

  &.lit {
    @apply bg-primary;
  }

  &.lit.clip {
    @apply bg-red-500;
  }
}

.time {
  @apply flex-shrink-0 font-mono text-xs text-primary/80 tabular-nums;
}

.time-sep {
  @apply mx-0.5 text-primary/40;
}

.time-total {
  @apply text-primary/55;
}
</style>
