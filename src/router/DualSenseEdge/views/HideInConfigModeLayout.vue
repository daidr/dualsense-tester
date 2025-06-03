<script setup lang="ts">
import { computed } from 'vue';
import { useInNormalMode } from '../_utils/composable.util'
import { useDevice } from '@/composables/useInjectValues';
import { sendOutputReportFactory } from '@/utils/dualsense/ds.util';
import { createAsyncLock } from '@/utils/lock.util';
import { m } from 'motion-v';

defineSlots<{
  default: () => void
}>()

const isNormalMode = useInNormalMode()

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

function handleTryExit() {
  const leaveOutputReport = new Uint8Array(63)
  leaveOutputReport[38] = 0x80
  sendOutputReport(leaveOutputReport)
}
</script>

<template>
  <slot v-if="isNormalMode" />
  <m.div layout="position" v-else
    class="mx-1px my-1px rounded-24px bg-orange/20 px-2 py-1 text-start text-sm text-orange ring-1 ring-orange/50">
    <p>
      {{ $t('profile_mode.abnormal_tips') }} <button @click="handleTryExit" class="inline underline underline-current/10 underline-dotted">
        {{ $t('profile_mode.try_exit') }}
      </button>
    </p>
  </m.div>
</template>

<style scoped></style>
