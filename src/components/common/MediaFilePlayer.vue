<script setup lang="ts">
import type { DualSensePlayer } from '@/composables/useDualSensePlayer'
import { AnimatePresence, m } from 'motion-v'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DouSelect from '@/components/base/DouSelect.vue'
import DouSwitch from '@/components/base/DouSwitch.vue'
import { useBtAudioPlayer } from '@/composables/useBtAudioPlayer'
import { useDualSensePlayer } from '@/composables/useDualSensePlayer'
import { useConnectionType } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { uiLogger } from '@/utils/logger.util'
import SliderBox from './SliderBox.vue'
import SpectrumView from './SpectrumView.vue'

withDefaults(defineProps<{
  accept?: string
  disabled?: boolean
}>(), {
  accept: 'audio/*',
})

const emit = defineEmits<{
  /** 播放状态变化，父组件据此应用/恢复 USB 音量等副作用。 */
  playingChange: [boolean]
}>()

/** 音频 / 震动两个开关，任意组合，但至少保持一个激活。 */
const audioEnabled = defineModel<boolean>('audioEnabled', { default: true })
const hapticEnabled = defineModel<boolean>('hapticEnabled', { default: false })
/** 音频目标（扬声器/耳机），USB 下父组件据此切 HID 音量。 */
const audioTarget = defineModel<string>('audioTarget', { default: 'speaker' })
/** 音频音量 0–255：蓝牙写进 0x36 报告，USB 由父组件写 HID 音量。 */
const audioVolume = defineModel<number>('audioVolume', { default: 200 })

const { t } = useI18n()

const connectionType = useConnectionType()
const isBluetooth = computed(() => connectionType.value === DeviceConnectionType.Bluetooth)

// 按连接类型选播放器内核：USB 走声卡端点（4 声道）；蓝牙走 Opus + 0x36 HID 报告。两者均按开关组合音频/触觉。
const player: DualSensePlayer = connectionType.value === DeviceConnectionType.Bluetooth
  ? useBtAudioPlayer({ audioEnabled, hapticEnabled, audioTarget, audioVolume })
  : useDualSensePlayer({ audioEnabled, hapticEnabled })
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

// 开关约束：关掉最后一个激活项时拒绝（保证任何时刻至少一个开）。
const audioSwitch = computed({
  get: () => audioEnabled.value,
  set: (v) => {
    if (v || hapticEnabled.value)
      audioEnabled.value = v
  },
})
const hapticSwitch = computed({
  get: () => hapticEnabled.value,
  set: (v) => {
    if (v || audioEnabled.value)
      hapticEnabled.value = v
  },
})

const targetOptions = computed(() => [
  { value: 'speaker', label: t('audio_panel.target_speaker') },
  { value: 'headphone', label: t('audio_panel.target_headphone') },
])
const motorOptions = computed(() => [
  { value: 'both', label: t('haptic_panel.target_both') },
  { value: 'left', label: t('haptic_panel.target_left') },
  { value: 'right', label: t('haptic_panel.target_right') },
])
const hapticChannelModel = computed({
  get: () => player.hapticChannel.value,
  set: value => player.setHapticChannel(value as 'left' | 'right' | 'both'),
})

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

// 拖动进度条时仅更新显示值，不每帧 seek —— 每次 seek 都会重建音频源（USB 还含 setSinkId
// 切换硬件端点），高频重建会越拖越卡。松手提交时（@change）才真正 seek 一次。
const scrubbing = ref(false)
const scrubValue = ref(0)
const scrubModel = computed({
  get: () => (scrubbing.value ? scrubValue.value : currentTime.value),
  set: (value) => {
    scrubbing.value = true
    scrubValue.value = value
  },
})
function onScrubCommit(value: number) {
  scrubbing.value = false
  player.seek(value)
}

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
          @change="onScrubCommit"
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

        <PopoverRoot>
          <PopoverTrigger
            as="button" type="button" class="icon-btn settings-btn"
            :aria-label="$t('audio_panel.settings')"
          >
            <span class="i-mingcute-settings-3-line" />
          </PopoverTrigger>
          <PopoverPortal to="#teleport-container">
            <PopoverContent class="settings-popover" align="end" :side-offset="8">
              <div class="popover-row">
                <span class="field-label">{{ $t('audio_panel.volume') }}</span>
                <SliderBox v-model="audioVolume" :min="0" :max="255" :digits="0" class="popover-volume" />
              </div>
              <div class="popover-row">
                <span class="field-label">{{ $t('audio_panel.sync_to_pc') }}</span>
                <DouSwitch v-model="syncToPC" />
              </div>
              <div v-if="!isBluetooth && audioEnabled" class="popover-row popover-output">
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
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>

      <div class="control-rows">
        <div class="control-row">
          <label class="field field-switch-inline">
            <span class="field-label">{{ $t('audio_panel.output_audio') }}</span>
            <DouSwitch v-model="audioSwitch" />
          </label>
          <label v-if="audioEnabled" class="field">
            <span class="field-label">{{ $t('audio_panel.target') }}</span>
            <DouSelect v-model="audioTarget" :options="targetOptions" />
          </label>
        </div>
        <div class="control-row">
          <label class="field field-switch-inline">
            <span class="field-label">{{ $t('audio_panel.output_haptic') }}</span>
            <DouSwitch v-model="hapticSwitch" />
          </label>
          <label v-if="hapticEnabled" class="field">
            <span class="field-label">{{ $t('haptic_panel.motor') }}</span>
            <DouSelect v-model="hapticChannelModel" :options="motorOptions" />
          </label>
        </div>
      </div>

      <AnimatePresence :initial="false">
        <m.div
          v-if="isPlaying"
          class="spectrum-wrap"
          :initial="{ height: 0, opacity: 0 }"
          :animate="{ height: 'auto', opacity: 1 }"
          :exit="{ height: 0, opacity: 0 }"
          :transition="{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }"
        >
          <SpectrumView :analyser="analyser" :active="isPlaying" />
        </m.div>
      </AnimatePresence>
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

.settings-btn {
  @apply w-7 h-7 text-base text-primary/70 hover-text-primary;
}

.control-rows {
  @apply flex flex-col gap-2;
}

// 频谱仅播放时显示，高度 0↔auto 折叠展开，overflow-hidden 裁剪画布避免溢出。
.spectrum-wrap {
  @apply overflow-hidden;
}

.control-row {
  // 固定行高：目标/马达下拉(select)比开关(switch)高，开关切换时若不固定会导致行高跳变。
  @apply flex flex-wrap items-center gap-x-4 gap-y-2 min-h-7;
}

.field {
  @apply flex items-center gap-2 min-w-0;
}

.field-switch-inline {
  @apply gap-1.5;
}

.field-label {
  @apply text-xs text-primary/70 whitespace-nowrap;
}

// PopoverContent 经 Portal 渲染到组件作用域外，需用 :deep 让样式生效（与 DouSelect 弹出框一致）。
:deep(.settings-popover) {
  @apply flex flex-col gap-2.5 p-3 min-w-64 z-10 select-none;
  @apply dou-sc-colorborder bg-white dark-bg-black rounded-2xl;
  @apply shadow-2xl shadow-black/20 dark-shadow-white/30;

  .popover-row {
    @apply flex items-center gap-3;
  }

  .popover-volume {
    @apply flex-1 min-w-32;
  }

  .popover-output {
    @apply flex-col items-start gap-1;
  }

  .field-label {
    @apply text-xs text-primary/70 whitespace-nowrap;
  }

  .output-btn {
    @apply flex items-center gap-1 min-w-0 w-full;
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
    @apply flex min-w-0 w-full;

    .select-wrapper {
      @apply flex-1 min-w-0;
    }

    .label {
      @apply truncate;
    }
  }
}
</style>
