<script setup lang="ts">
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DouSelect from '@/components/base/DouSelect.vue'
import DouSwitch from '@/components/base/DouSwitch.vue'
import { useDualSensePlayer } from '@/composables/useDualSensePlayer'
import { uiLogger } from '@/utils/logger.util'
import SliderBox from './SliderBox.vue'
import SpectrumView from './SpectrumView.vue'

withDefaults(defineProps<{
  /** 目标下拉选项（音频：扬声器/耳机；触觉：左/右/双马达）。 */
  targetOptions: { value: string, label: string }[]
  accept?: string
  disabled?: boolean
}>(), {
  accept: 'audio/*',
})

const emit = defineEmits<{
  /** 播放状态变化，父组件据此应用/恢复目标副作用。 */
  playingChange: [boolean]
}>()

/** 当前选中的目标，副作用（HID 音量 / 声道路由）由父组件监听处理。 */
const target = defineModel<string>('target', { required: true })

const { t } = useI18n()

const player = useDualSensePlayer()
const {
  fileName,
  hasClip,
  isPlaying,
  currentTime,
  duration,
  syncToPC,
  outputDevices,
  sinkId,
  sinkLabel,
  outputPickerSupported,
  analyser,
} = player

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

// reka-ui 的 SelectItem 不允许空字符串 value，用 sentinel 代表「系统默认」，传给 setSinkId 前转回 ''。
const SYSTEM_DEFAULT = '__system_default__'

const outputOptions = computed(() => {
  const list = outputDevices.value
    .filter(device => device.deviceId)
    .map((device, index) => ({
      value: device.deviceId,
      label: device.label || t('audio_panel.output_generic', { n: index + 1 }),
    }))
  return [{ value: SYSTEM_DEFAULT, label: t('audio_panel.output_default') }, ...list]
})

const scrubModel = computed({
  get: () => currentTime.value,
  set: value => player.seek(value),
})

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function looksLikeDualSense(label: string): boolean {
  const l = label.toLowerCase()
  return l.includes('dualsense') || l.includes('wireless controller')
}

async function refreshAndAutoPick() {
  await player.refreshOutputDevices()
  // 自动预选疑似 DualSense 的输出端点
  if (!sinkId.value) {
    const match = outputDevices.value.find(device => looksLikeDualSense(device.label))
    if (match) {
      await player.setSinkDevice(match.deviceId)
    }
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  try {
    await player.loadFile(file)
    await refreshAndAutoPick()
  }
  catch (error) {
    uiLogger.error('loadFile failed', error)
  }
  finally {
    input.value = ''
  }
}

function togglePlay() {
  if (isPlaying.value) {
    player.pause()
  }
  else {
    void player.play()
  }
}

function onSelectOutput(deviceId: string) {
  void player.setSinkDevice(deviceId === SYSTEM_DEFAULT ? '' : deviceId)
}

watch(isPlaying, value => emit('playingChange', value))

onMounted(() => {
  void player.refreshOutputDevices()
})

defineExpose({ player })
</script>

<template>
  <div class="media-player">
    <input
      ref="fileInput" type="file" :accept="accept" class="hidden"
      @change="onFileChange"
    >

    <div v-if="!hasClip" class="upload-row">
      <button type="button" class="upload-btn dou-sc-btn" :disabled="disabled" @click="triggerUpload">
        <span class="i-mingcute-upload-2-line" />
        {{ $t('audio_panel.upload_file') }}
      </button>
    </div>

    <template v-else>
      <div class="file-row">
        <span class="i-mingcute-music-2-line shrink-0" />
        <span class="file-name">{{ fileName }}</span>
        <button type="button" class="replace-btn" @click="triggerUpload">
          {{ $t('audio_panel.replace_file') }}
        </button>
      </div>

      <div class="player-row">
        <button
          type="button" class="icon-btn play-btn"
          :aria-label="isPlaying ? $t('audio_panel.pause') : $t('audio_panel.play')"
          @click="togglePlay"
        >
          <span :class="isPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill'" />
        </button>

        <SliderBox
          v-model="scrubModel" class="scrub" :min="0" :max="duration || 1" :digits="2"
          :aria-label="$t('audio_panel.progress')"
        >
          <template #default="{ value }">
            {{ formatTime(value) }}
          </template>
        </SliderBox>

        <span class="time">
          <span>{{ formatTime(currentTime) }}</span>
          <span class="time-sep">/</span>
          <span class="time-total">{{ formatTime(duration) }}</span>
        </span>
      </div>

      <SpectrumView :analyser="analyser" :active="isPlaying" />

      <div class="control-row">
        <label class="field">
          <span class="field-label">{{ $t('audio_panel.target') }}</span>
          <DouSelect v-model="target" :options="targetOptions" />
        </label>

        <label class="field">
          <span class="field-label">{{ $t('audio_panel.output_device') }}</span>
          <button
            v-if="outputPickerSupported" type="button" class="output-btn dou-sc-colorborder"
            @click="player.selectOutputDevice()"
          >
            <span class="i-mingcute-volume-line shrink-0" />
            <span class="output-name">{{ sinkLabel || $t('audio_panel.output_default') }}</span>
            <span class="i-mingcute-down-line shrink-0" />
          </button>
          <template v-else>
            <div class="output-select">
              <DouSelect
                :model-value="sinkId || SYSTEM_DEFAULT" :options="outputOptions"
                @update:model-value="onSelectOutput"
              />
            </div>
            <button
              v-if="!player.hasNamedOutputs()" type="button" class="grant-btn"
              @click="player.requestDeviceAccess()"
            >
              {{ $t('audio_panel.list_devices') }}
            </button>
          </template>
        </label>

        <label class="field field-switch">
          <span class="field-label">{{ $t('audio_panel.sync_to_pc') }}</span>
          <DouSwitch v-model="syncToPC" />
        </label>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.media-player {
  @apply flex flex-col gap-3 w-full min-w-0;
}

.upload-row {
  @apply flex;
}

.upload-btn {
  @apply h-8 px-3 text-sm flex items-center gap-1;
}

.file-row {
  @apply flex items-center gap-2 min-w-0 text-sm text-primary;
}

.file-name {
  @apply flex-1 min-w-0 truncate;
}

.replace-btn {
  @apply shrink-0 text-xs text-primary/70 underline underline-dotted hover-text-primary;
}

.player-row {
  @apply flex items-center gap-3 min-w-0;
}

.icon-btn {
  @apply flex-shrink-0 flex items-center justify-center rounded-full transition;
  @apply hover-bg-primary/12 active-scale-90;
}

.play-btn {
  @apply w-8 h-8 text-xl text-white bg-primary hover-bg-primary/85;
}

.scrub {
  @apply flex-1 min-w-12;
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

.control-row {
  @apply flex flex-wrap items-center gap-x-4 gap-y-2;
}

.field {
  @apply flex items-center gap-2 min-w-0;
}

.field-label {
  @apply text-xs text-primary/70 whitespace-nowrap;
}

.field-switch {
  @apply ms-auto;
}

.output-btn {
  @apply flex items-center gap-1 min-w-0 max-w-48;
  @apply text-sm text-primary rounded-full ps-2 pe-1 py-0.5 cursor-pointer;
  @apply transition active-bg-primary active-text-white;
}

.output-name {
  @apply flex-1 min-w-0 truncate;
}

.grant-btn {
  @apply shrink-0 text-xs text-primary px-2 py-0.5 rounded-full cursor-pointer;
  @apply dou-sc-colorborder transition active-bg-primary active-text-white;
}

.output-select {
  @apply flex min-w-0 max-w-48;

  :deep(.select-wrapper) {
    @apply flex-1 min-w-0;
  }

  :deep(.label) {
    @apply truncate;
  }
}
</style>
