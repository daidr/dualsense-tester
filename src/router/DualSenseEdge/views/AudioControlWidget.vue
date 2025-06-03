<script setup lang="ts">
import HoldActiveButton from '@/components/common/HoldActiveButton.vue'
import { useDevice } from '@/composables/useInjectValues'
import { controlWaveOut } from '@/utils/dualsense/ds.util'
import { sleep } from '@/utils/time.util'
import { useEventBusEmit } from '../_utils/eventbus.util'

const device = useDevice()
const eventBusEmit = useEventBusEmit()

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
</template>

<style scoped lang="scss">
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
</style>
