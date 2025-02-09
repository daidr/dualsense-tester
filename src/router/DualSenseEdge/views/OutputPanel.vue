<script setup lang="ts">
import type { PlayerLedBrightness } from '@/utils/dualsense/ds.type'
import ColorInput from '@/components/common/ColorInput.vue'
import GroupedButton from '@/components/common/GroupedButton.vue'
import SelfResettingSlider from '@/components/common/SelfResettingSlider.vue'
import { useDevice } from '@/composables/useInjectValues'
import { hexToRgb, rgbToHex } from '@/utils/color.util'
import { MuteButtonLedControl, PlayerLedControl } from '@/utils/dualsense/ds.type'
import { sendOutputReportFactory } from '@/utils/dualsense/ds.util'
import { bitShiftByte } from '@/utils/format.util'
import { computed, onMounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { OutputStruct } from './_OutputPanel/outputStruct'
import TriggerEffect from './_OutputPanel/TriggerEffect.vue'
import { createAsyncLock } from '@/utils/lock.util'
import { useEventBusRegister } from '../_utils/eventbus.util'
import SliderBox from '@/components/common/SliderBox.vue'

const { t } = useI18n()
const device = useDevice()

const struct = new OutputStruct()

function setValidFlag(target: Ref<number>) {
  return (validFlag: number, isAdd = true) => {
    const num = bitShiftByte(1, validFlag)
    if (isAdd) {
      target.value |= num
    }
    else {
      target.value = num
    }
  }
}
function clearValidFlag(target: Ref<number>) {
  return (validFlag: number) => {
    const num = bitShiftByte(1, validFlag)
    target.value &= ~num
  }
}
const setValidFlag0 = setValidFlag(struct.validFlag0)
const setValidFlag1 = setValidFlag(struct.validFlag1)
const setValidFlag2 = setValidFlag(struct.validFlag2)
const clearValidFlag0 = clearValidFlag(struct.validFlag0)
const clearValidFlag1 = clearValidFlag(struct.validFlag1)
const clearValidFlag2 = clearValidFlag(struct.validFlag2)

// #region Mic Mute LED
const micMuteState = computed<MuteButtonLedControl>({
  get() {
    return struct.muteLedControl.value
  },
  async set(value) {
    struct.muteLedControl.value = value
    await sendOutputReport(
      () => {
        setValidFlag1(0)
        clearValidFlag1(3)
      },
      () => {
        clearValidFlag1(0)
      },
    )
  },
})

const micMuteBtnSets = computed(() => {
  return [
    {
      value: MuteButtonLedControl.MIC_THRU,
      label: t('output_panel.mic_mute_led_off'),
    },
    {
      value: MuteButtonLedControl.MIC_MUTED,
      label: t('output_panel.mic_mute_led_on'),
    },
    {
      value: MuteButtonLedControl.ALL_MUTED,
      label: t('output_panel.mic_mute_led_blink'),
    },
  ]
})
// #endregion

// #region Lightbar Color
const lightbarColorState = computed<string>({
  get() {
    return rgbToHex([struct.ledCRed.value, struct.ledCGreen.value, struct.ledCBlue.value])
  },
  async set(value) {
    const colors = hexToRgb(value)

    struct.ledCRed.value = colors[0]
    struct.ledCGreen.value = colors[1]
    struct.ledCBlue.value = colors[2]
    await sendOutputReport(
      () => {
        setValidFlag1(2)
        clearValidFlag1(3)
      },
      () => {
        clearValidFlag1(2)
      },
    )
  },
})
// #endregion

// #region Player LED Count
const playerLEDCountState = computed<PlayerLedControl>({
  get() {
    return struct.playerIndicator.value
  },
  async set(value) {
    struct.playerIndicator.value = value ?? 0
    await sendOutputReport(
      () => {
        setValidFlag1(4)
        clearValidFlag1(3)
      },
      () => {
        clearValidFlag1(4)
      },
    )
  },
})
const playerLEDCountSets = computed(() => {
  return [
    {
      value: PlayerLedControl.OFF,
      label: t('output_panel.player_led_off'),
    },
    {
      value: PlayerLedControl.PLAYER_1,
      label: '1',
    },
    {
      value: PlayerLedControl.PLAYER_2,
      label: '2',
    },
    {
      value: PlayerLedControl.PLAYER_3,
      label: '3',
    },
    {
      value: PlayerLedControl.PLAYER_4,
      label: '4',
    },
    {
      value: PlayerLedControl.ALL,
      label: t('output_panel.player_led_all'),
    },
  ]
})
// #endregion

// #region Player LED Brightness
const playerLEDBrightnessState = computed<PlayerLedBrightness>({
  get() {
    return struct.ledBrightness.value
  },
  async set(value) {
    struct.ledBrightness.value = value
    await sendOutputReport(
      () => {
        setValidFlag2(0)
        clearValidFlag1(3)
      },
      () => {
        clearValidFlag2(0)
      },
    )
  },
})
const playerLEDBrightnessSets = computed(() => {
  return [{
    value: 0,
    label: t('output_panel.player_led_brightness_high'),
  }, {
    value: 1,
    label: t('output_panel.player_led_brightness_medium'),
  }, {
    value: 2,
    label: t('output_panel.player_led_brightness_low'),
  }]
})
// #endregion

// #region Rumble Heavy
const motorLeft = computed({
  get() {
    return struct.bcVibrationLeft.value
  },
  async set(value) {
    struct.bcVibrationLeft.value = value
    await sendOutputReport(
      () => {
        setValidFlag0(0)
        setValidFlag0(1)
      },
      () => {
      },
    )
  },
})
// #endregion

// #region Rumble Light
const motorRight = computed({
  get() {
    return struct.bcVibrationRight.value
  },
  async set(value) {
    struct.bcVibrationRight.value = value
    await sendOutputReport(
      () => {
        setValidFlag0(0)
        setValidFlag0(1)
      },
      () => {
      },
    )
  },
})
// #endregion

// #region Trigger Effect Update
function handleTriggerUpdate() {
  sendOutputReport(() => {
    setValidFlag0(3)
    setValidFlag0(2)
  }, () => {
    clearValidFlag0(3)
    clearValidFlag0(2)
  })
}
// #endregion

// #region Speaker Volume
const speakerVolume = computed({
  get() {
    return struct.speakerVolume.value
  },
  async set(value) {
    struct.speakerVolume.value = value
    struct.audioControl.value = bitShiftByte(3, 4)
    await sendOutputReport(
      () => {
        setValidFlag0(5)
        setValidFlag0(7)
        clearValidFlag0(0)
        clearValidFlag0(1)
      },
      () => {
        clearValidFlag0(5)
        clearValidFlag0(7)
      },
    )
  },
})
// #endregion

// #region Headphone Volume
const headphoneVolume = computed({
  get() {
    return struct.headphoneVolume.value
  },
  async set(value) {
    struct.headphoneVolume.value = value
    struct.audioControl.value = bitShiftByte(0, 4)
    await sendOutputReport(
      () => {
        setValidFlag0(4)
        setValidFlag0(7)
        clearValidFlag0(0)
        clearValidFlag0(1)
      },
      () => {
        clearValidFlag0(4)
        clearValidFlag0(7)
      },
    )
  },
})
// #endregion


const _sendOutputReport = computed(() => {
  return sendOutputReportFactory(device.value)
})

const outputReportLock = createAsyncLock()
async function sendOutputReport(before?: () => void, after?: () => void) {
  await outputReportLock(async () => {
    before?.()
    const outputReport = struct.reportData
    await _sendOutputReport.value(outputReport)
    after?.()
  })
  // cancelAnimationFrame(rafId)
  // rafId = requestAnimationFrame(async () => {
  //   before?.()
  //   const outputReport = struct.reportData
  //   await _sendOutputReport.value(outputReport)
  //   after?.()
  // })
}

onMounted(() => {
  sendOutputReport(() => {
    setValidFlag0(0)
    setValidFlag0(1)
    setValidFlag0(2)
    setValidFlag0(4)
    setValidFlag0(5)
    setValidFlag0(6)
    setValidFlag0(7)
    setValidFlag2(1)
    struct.lightbarSetup.value = bitShiftByte(2, 0)
  }, () => {
    clearValidFlag0(0)
    clearValidFlag0(1)
    clearValidFlag0(2)
    clearValidFlag0(4)
    clearValidFlag0(5)
    clearValidFlag0(6)
    clearValidFlag0(7)
    clearValidFlag2(1)
  })
})

useEventBusRegister('output:set-speaker-volume', (volume: number) => {
  speakerVolume.value = volume
})

useEventBusRegister('output:set-headphone-volume', (volume: number) => {
  headphoneVolume.value = volume
})

let lastSpeakerVolume = 0
useEventBusRegister('output:store-speaker-volume', () => {
  lastSpeakerVolume = speakerVolume.value
})
useEventBusRegister('output:retrieve-speaker-volume', () => {
  speakerVolume.value = lastSpeakerVolume
})
let lastHeadphoneVolume = 0
useEventBusRegister('output:store-headphone-volume', () => {
  lastHeadphoneVolume = headphoneVolume.value
})
useEventBusRegister('output:retrieve-headphone-volume', () => {
  headphoneVolume.value = lastHeadphoneVolume
})
</script>

<template>
  <table>
    <tbody>
      <tr>
        <td class="label">
          {{ $t('output_panel.mic_mute_led') }}
        </td>
        <td class="value">
          <div>
            <GroupedButton v-model="micMuteState" :sets="micMuteBtnSets" />
          </div>
        </td>
      </tr>
      <tr>
        <td class="label">
          {{ $t('output_panel.lightbar_color') }}
        </td>
        <td class="value">
          <div>
            <ColorInput v-model="lightbarColorState" />
          </div>
        </td>
      </tr>
      <tr>
        <td class="label">
          {{ $t('output_panel.player_led') }}
        </td>
        <td class="value">
          <div>
            <GroupedButton v-model="playerLEDCountState" :sets="playerLEDCountSets" />
          </div>
        </td>
      </tr>
      <tr>
        <td class="label">
          {{ $t('output_panel.player_led_brightness') }}
        </td>
        <td class="value">
          <div>
            <GroupedButton v-model="playerLEDBrightnessState" :sets="playerLEDBrightnessSets" />
          </div>
        </td>
      </tr>
      <tr>
        <td class="label">
          {{ $t('output_panel.rumble_heavy') }}
        </td>
        <td class="value">
          <div>
            <SelfResettingSlider v-model="motorLeft" class="w-full" :min="0" :max="255" />
          </div>
        </td>
      </tr>
      <tr>
        <td class="label">
          {{ $t('output_panel.rumble_soft') }}
        </td>
        <td class="value">
          <div>
            <SelfResettingSlider v-model="motorRight" class="w-full" :min="0" :max="255" />
          </div>
        </td>
      </tr>
      <TriggerEffect is="left" :struct="struct" @effect-update="handleTriggerUpdate" />
      <TriggerEffect is="right" :struct="struct" @effect-update="handleTriggerUpdate" />
      <tr>
        <td class="label">
          {{ $t('output_panel.speaker_volume') }}
        </td>
        <td class="value">
          <div>
            <SliderBox v-model="speakerVolume" class="w-full" :min="0" :max="255" />
          </div>
        </td>
      </tr>
      <tr>
        <td class="label">
          {{ $t('output_panel.headphone_volume') }}
        </td>
        <td class="value">
          <div>
            <SliderBox v-model="headphoneVolume" class="w-full" :min="0" :max="255" />
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
  @apply max-w-50% pl-2;

  &>div {
    @apply flex items-center justify-end;
  }
}
</style>
