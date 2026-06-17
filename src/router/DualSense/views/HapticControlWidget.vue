<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MediaFilePlayer from '@/components/common/MediaFilePlayer.vue'
import { useConnectionType } from '@/composables/useInjectValues'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { useEventBusEmit } from '../_utils/eventbus.util'

const { t } = useI18n()
const connectionType = useConnectionType()
const eventBusEmit = useEventBusEmit()

// USB 下 DualSense 声卡的后 2 声道(ch2/ch3)驱动触觉马达；蓝牙路径后续实现。
const isHapticTestable = computed(() => connectionType.value === DeviceConnectionType.USB)

const hapticTarget = ref('both')
const hapticTargetOptions = computed(() => [
  { value: 'both', label: t('haptic_panel.target_both') },
  { value: 'left', label: t('haptic_panel.target_left') },
  { value: 'right', label: t('haptic_panel.target_right') },
])

// 触觉走声卡 ch2/ch3，但实测需把扬声器和耳机音量都拉满才有足够的触觉强度（音量字节影响音频子系统总增益）。
// 与音频不同：触觉不受 audioControl 路由影响，所以同时设两路是安全的。
let volumeStored = false
function onPlayingChange(playing: boolean) {
  if (playing) {
    eventBusEmit('output:store-speaker-volume')
    eventBusEmit('output:store-headphone-volume')
    volumeStored = true
    eventBusEmit('output:set-speaker-volume', 255)
    eventBusEmit('output:set-headphone-volume', 255)
  }
  else if (volumeStored) {
    eventBusEmit('output:retrieve-speaker-volume')
    eventBusEmit('output:retrieve-headphone-volume')
    volumeStored = false
  }
}
</script>

<template>
  <div class="haptic-control">
    <MediaFilePlayer
      v-if="isHapticTestable"
      v-model:target="hapticTarget"
      :target-options="hapticTargetOptions"
      mode="haptic"
      accept="audio/*"
      @playing-change="onPlayingChange"
    />
    <p v-else class="hint">
      {{ $t('haptic_panel.usb_only') }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.haptic-control {
  @apply w-full min-w-0;
}

.hint {
  @apply text-xs text-gray-500 dark-text-gray-400;
}
</style>
