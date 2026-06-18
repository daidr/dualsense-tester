<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HoldActiveButton from '@/components/common/HoldActiveButton.vue'
import MediaFilePlayer from '@/components/common/MediaFilePlayer.vue'
import { useConnectionType, useDevice } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { controlWaveOut } from '@/utils/dualsense/ds.util'
import { sleep } from '@/utils/time.util'
import { useEventBusEmit } from '../_utils/eventbus.util'

const device = useDevice()
const connectionType = useConnectionType()
const eventBusEmit = useEventBusEmit()

const isBluetooth = computed(() => connectionType.value === DeviceConnectionType.Bluetooth)
const isFilePlaybackSupported = computed(() =>
  connectionType.value === DeviceConnectionType.USB
  || connectionType.value === DeviceConnectionType.Bluetooth,
)

// 音频 / 震动两个开关任意组合（MediaFilePlayer 内保证至少一个激活）。
const audioEnabled = ref(true)
const hapticEnabled = ref(false)
const audioTarget = ref('speaker')
const audioVolume = ref(200)

// USB 下音量靠 HID 报告切换；蓝牙音量在 0x36 流报告内携带，跳过。
let volumeStored = false

function applyVolume() {
  if (hapticEnabled.value) {
    // 触觉需要音频子系统满增益，两路都拉满（触觉走 ch2/ch3，不受 audioControl 路由影响）。
    eventBusEmit('output:set-speaker-volume', 255)
    eventBusEmit('output:set-headphone-volume', 255)
    // 音频同时开时，最后重设目标那一路，确保 audioControl 路由到目标输出（扬声器/耳机互斥）。
    if (audioEnabled.value) {
      eventBusEmit(audioTarget.value === 'headphone' ? 'output:set-headphone-volume' : 'output:set-speaker-volume', 255)
    }
  }
  else if (audioTarget.value === 'headphone') {
    eventBusEmit('output:set-headphone-volume', audioVolume.value)
  }
  else {
    eventBusEmit('output:set-speaker-volume', audioVolume.value)
  }
}

function onPlayingChange(playing: boolean) {
  if (isBluetooth.value) {
    return
  }
  if (playing) {
    eventBusEmit('output:store-speaker-volume')
    eventBusEmit('output:store-headphone-volume')
    volumeStored = true
    applyVolume()
  }
  else if (volumeStored) {
    eventBusEmit('output:retrieve-speaker-volume')
    eventBusEmit('output:retrieve-headphone-volume')
    volumeStored = false
  }
}

watch([audioTarget, audioEnabled, hapticEnabled, audioVolume], () => {
  if (volumeStored) {
    applyVolume()
  }
})

// 1kHz 正弦波硬件测试（与文件播放独立）。
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
        v-if="isFilePlaybackSupported"
        v-model:audio-enabled="audioEnabled"
        v-model:haptic-enabled="hapticEnabled"
        v-model:audio-target="audioTarget"
        v-model:audio-volume="audioVolume"
        accept="audio/*"
        @playing-change="onPlayingChange"
      />
      <p v-else class="hint">
        {{ $t('audio_panel.file_playback_unsupported') }}
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
