<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import HoldActiveButton from '@/components/common/HoldActiveButton.vue'
import MediaFilePlayer from '@/components/common/MediaFilePlayer.vue'
import { useConnectionType, useDevice } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { controlWaveOut } from '@/utils/dualsense/ds.util'
import { sleep } from '@/utils/time.util'
import { useEventBusEmit } from '../_utils/eventbus.util'

const { t } = useI18n()
const device = useDevice()
const connectionType = useConnectionType()
const eventBusEmit = useEventBusEmit()

// MVP 阶段，文件播放走 USB Audio Class 声卡端点（setSinkId），仅 USB 可用；蓝牙路径后续实现。
const isFilePlaybackAvailable = computed(() => connectionType.value === DeviceConnectionType.USB)

const audioTarget = ref('speaker')
const audioTargetOptions = computed(() => [
  { value: 'speaker', label: t('audio_panel.target_speaker') },
  { value: 'headphone', label: t('audio_panel.target_headphone') },
])

// 「扬声器/耳机」靠 HID 音量切换（与 1kHz 测试一致）：播放时存储原音量并应用目标音量，停止时恢复。
let volumeStored = false

function applyAudioTargetVolume() {
  if (audioTarget.value === 'headphone') {
    eventBusEmit('output:set-headphone-volume', 65)
    eventBusEmit('output:set-speaker-volume', 0)
  }
  else {
    eventBusEmit('output:set-speaker-volume', 85)
    eventBusEmit('output:set-headphone-volume', 0)
  }
}

function onPlayingChange(playing: boolean) {
  if (playing) {
    eventBusEmit('output:store-speaker-volume')
    eventBusEmit('output:store-headphone-volume')
    volumeStored = true
    applyAudioTargetVolume()
  }
  else if (volumeStored) {
    eventBusEmit('output:retrieve-speaker-volume')
    eventBusEmit('output:retrieve-headphone-volume')
    volumeStored = false
  }
}

watch(audioTarget, () => {
  if (volumeStored) {
    applyAudioTargetVolume()
  }
})

let hpResolver: () => void
let spkResolver: () => void
let hpLock = Promise.resolve()
let spkLock = Promise.resolve()

async function startHPWaveout() {
  hpLock = new Promise<void>((resolve) => {
    hpResolver = resolve
  })
  eventBusEmit('output:store-headphone-volume')
  eventBusEmit('output:store-speaker-volume')
  eventBusEmit('output:set-speaker-volume', 0)
  eventBusEmit('output:set-headphone-volume', 65)
  await sleep(20)
  controlWaveOut(device.value, true, 'headphone')
  await hpLock
  controlWaveOut(device.value, false, 'headphone')
  eventBusEmit('output:retrieve-headphone-volume')
  eventBusEmit('output:retrieve-speaker-volume')
}

async function stopHPWaveout() {
  hpResolver()
}

async function startSPKWaveout() {
  spkLock = new Promise<void>((resolve) => {
    spkResolver = resolve
  })
  eventBusEmit('output:store-headphone-volume')
  eventBusEmit('output:store-speaker-volume')
  eventBusEmit('output:set-speaker-volume', 85)
  eventBusEmit('output:set-headphone-volume', 0)
  await sleep(20)
  controlWaveOut(device.value, true, 'speaker')

  await spkLock
  controlWaveOut(device.value, false, 'speaker')
  eventBusEmit('output:retrieve-headphone-volume')
  eventBusEmit('output:retrieve-speaker-volume')
}

async function stopSPKWaveout() {
  spkResolver()
}
</script>

<template>
  <div class="audio-control">
    <table>
      <tbody>
        <tr>
          <td class="label">
            {{ $t('audio_panel.headphone_1khz_sine_wave_test') }}
          </td>
          <td class="value">
            <div>
              <HoldActiveButton @hold="startHPWaveout" @release="stopHPWaveout" />
            </div>
          </td>
        </tr>
        <tr>
          <td class="label">
            {{ $t('audio_panel.speaker_1khz_sine_wave_test') }}
          </td>
          <td class="value">
            <div>
              <HoldActiveButton @hold="startSPKWaveout" @release="stopSPKWaveout" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="file-section">
      <span class="section-title">{{ $t('audio_panel.file_playback') }}</span>
      <MediaFilePlayer
        v-if="isFilePlaybackAvailable"
        v-model:target="audioTarget"
        :target-options="audioTargetOptions"
        accept="audio/*"
        @playing-change="onPlayingChange"
      />
      <p v-else class="hint">
        {{ $t('audio_panel.file_playback_usb_only') }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.audio-control {
    @apply flex flex-col gap-3 w-full min-w-0;
}

table {
    @apply w-full;
}

.label,
:deep(.label) {
    @apply text-primary font-bold whitespace-pre-wrap;
}

.value,
:deep(.value) {
    @apply max-w-50% ps-2;

    &>div {
        @apply flex items-center justify-end;
    }
}

.file-section {
    @apply flex flex-col gap-2 pt-3 border-t border-gray-3 dark-border-gray-6;
}

.section-title {
    @apply text-primary font-bold text-sm;
}

.hint {
    @apply text-xs text-gray-500 dark-text-gray-400;
}
</style>
