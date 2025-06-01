<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DouSwitch from '@/components/base/DouSwitch.vue'
import ControllerTextButton from '@/components/common/ControllerTextButton.vue'
import { onDocumentUnload } from '@/composables/onDocumentUnload'
import { useDevice, useInputReport } from '@/composables/useInjectValues'
import { sendOutputReportFactory } from '@/utils/dualsense/ds.util'
import { createAsyncLock } from '@/utils/lock.util'
import { DSEProfile } from '../profile'
import TriggerDeadZonePreview from './TriggerDeadZone/TriggerDeadZonePreview.vue'

const props = defineProps<{
  profile: DSEProfile
}>()

const enterOutputReport = new Uint8Array(63)
const leaveOutputReport = new Uint8Array(63)
enterOutputReport[38] = leaveOutputReport[38] = 0x80
enterOutputReport[40] = 0x03

function createNewEnterReport(left: number[], right: number[]) {
  const newReport = enterOutputReport.slice()
  newReport[49] = DSEProfile.utils.encodeTriggerLimit(left[0])
  newReport[50] = DSEProfile.utils.encodeTriggerLimit(left[1])
  newReport[51] = DSEProfile.utils.encodeTriggerLimit(right[0])
  newReport[52] = DSEProfile.utils.encodeTriggerLimit(right[1])
  return newReport
}

function setTriggerDeadZone(val: typeof props.profile.triggerDeadzone) {
  props.profile.triggerDeadzone = val
  sendEnterReport(val)
}

function sendEnterReport(deadzone: typeof props.profile.triggerDeadzone) {
  if (deadzone.unified) {
    sendOutputReport(createNewEnterReport(deadzone.unified, deadzone.unified))
  }
  else {
    sendOutputReport(createNewEnterReport(deadzone.left, deadzone.right))
  }
}

const limits = computed({
  get: () => {
    if (props.profile.triggerDeadzone.unified) {
      return {
        left: props.profile.triggerDeadzone.unified,
        right: props.profile.triggerDeadzone.unified,
      }
    }
    return {
      left: props.profile.triggerDeadzone.left,
      right: props.profile.triggerDeadzone.right,
    }
  },
  set: (value) => {
    if (props.profile.triggerDeadzone.unified) {
      setTriggerDeadZone({
        unified: value.left,
      })
    }
    else {
      setTriggerDeadZone({
        unified: false,
        left: value.left,
        right: value.right,
      })
    }
  },
})

const unified = computed({
  get: () => !!props.profile.triggerDeadzone.unified,
  set: (value) => {
    if (value) {
      setTriggerDeadZone({
        unified: limits.value.left,
      })
    }
    else {
      setTriggerDeadZone({
        unified: false,
        left: limits.value.left,
        right: limits.value.right,
      })
    }
  },
})

const leftMin = computed({
  get: () => limits.value.left[0],
  set: (value) => {
    const newLimits = { ...limits.value, left: [value, limits.value.left[1]] }
    limits.value = newLimits
  },
})

const leftMax = computed({
  get: () => limits.value.left[1],
  set: (value) => {
    const newLimits = { ...limits.value, left: [limits.value.left[0], value] }
    limits.value = newLimits
  },
})

const rightMin = computed({
  get: () => limits.value.right[0],
  set: (value) => {
    const newLimits = { ...limits.value, right: [value, limits.value.right[1]] }
    limits.value = newLimits
  },
})

const rightMax = computed({
  get: () => limits.value.right[1],
  set: (value) => {
    const newLimits = { ...limits.value, right: [limits.value.right[0], value] }
    limits.value = newLimits
  },
})

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

onMounted(() => {
  sendOutputReport(enterOutputReport)
  sendEnterReport(props.profile.triggerDeadzone)

  function dispose() {
    sendOutputReport(leaveOutputReport)
  }

  onBeforeUnmount(() => {
    dispose()
  })

  onDocumentUnload(() => {
    dispose()
  })
})

const inputReport = useInputReport()

const currentTriggerPreview = computed(() => {
  return {
    left: DSEProfile.utils.decodeTriggerLimit(inputReport.value.getUint8(23)),
    right: DSEProfile.utils.decodeTriggerLimit(inputReport.value.getUint8(24)),
    finalLeft: DSEProfile.utils.decodeTriggerLimit(inputReport.value.getUint8(25)),
    finalRight: DSEProfile.utils.decodeTriggerLimit(inputReport.value.getUint8(26)),
  }
})

const currentSide = ref<'left' | 'right'>('left')

watch(() => currentTriggerPreview.value, (value, oldValue) => {
  if (value.right !== oldValue.right) {
    currentSide.value = 'right'
  }
  else if (value.left !== oldValue.left) {
    currentSide.value = 'left'
  }
})

const currentUnifiedTrigger = computed(() => {
  if (currentSide.value === 'left') {
    return {
      val: currentTriggerPreview.value.left,
      finalVal: currentTriggerPreview.value.finalLeft,
    }
  }
  return {
    val: currentTriggerPreview.value.right,
    finalVal: currentTriggerPreview.value.finalRight,
  }
})
</script>

<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-wrap items-center justify-center gap-3">
      <i18n-t tag="div" keypath="profile_mode.trigger_deadzone.use_unified_tips" scope="global">
        <template #L2>
          <ControllerTextButton text="L2" small />
        </template>
        <template #R2>
          <ControllerTextButton text="R2" small />
        </template>
      </i18n-t>
      <DouSwitch v-model="unified" />
    </div>
    <div class="grid gap-5 px-2 sm:grid-cols-2">
      <template v-if="unified">
        <TriggerDeadZonePreview
          v-model:min="leftMin" v-model:max="leftMax"
          :current="currentUnifiedTrigger.val" :real-current="currentUnifiedTrigger.finalVal" side="unified"
        />
      </template>
      <template v-else>
        <TriggerDeadZonePreview
          v-model:min="leftMin" v-model:max="leftMax"
          :current="currentTriggerPreview.left" :real-current="currentTriggerPreview.finalLeft" side="left"
        />
        <TriggerDeadZonePreview
          v-model:min="rightMin" v-model:max="rightMax"
          :current="currentTriggerPreview.right" :real-current="currentTriggerPreview.finalRight" side="right"
        />
      </template>
    </div>
  </div>
</template>

<style scoped></style>
