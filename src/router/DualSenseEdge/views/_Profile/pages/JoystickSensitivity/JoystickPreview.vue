<script setup lang="ts">
import type { DSEJoystickProfile } from '../../profile'
import { storeToRefs } from 'pinia'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DouSelect from '@/components/base/DouSelect.vue'
import JoystickCurveGraph from '@/components/common/JoystickCurveGraph.vue'
import JoystickPreviewGraph from '@/components/common/JoystickPreviewGraph.vue'
import SliderBox from '@/components/common/SliderBox.vue'
import { usePageStore } from '@/store/page'
import { DSEJoystickCurveMap, DSEJoystickCurvePos, DSEJoystickProfilePreset } from '../../profile'
import { useThrottleFn } from '@vueuse/core'
import { Tooltip } from 'floating-vue'

defineProps<{
  current: number
  x: number
  y: number
  finalX: number
  finalY: number
}>()

const modelValue = defineModel<DSEJoystickProfile>({ required: true })

const pageStore = usePageStore()

const { colorPalette } = storeToRefs(pageStore)

const { t } = useI18n()

const curveOptions = computed(() => [
  {
    label: t('profile_mode.joystick_curves.default'),
    value: DSEJoystickProfilePreset.DEFAULT,
    extra: {
      icon: 'i-fancy-controller-curve-default',
    },
  },
  {
    label: t('profile_mode.joystick_curves.quick'),
    value: DSEJoystickProfilePreset.QUICK,
    extra: {
      icon: 'i-fancy-controller-curve-quick',
    },
  },
  {
    label: t('profile_mode.joystick_curves.precise'),
    value: DSEJoystickProfilePreset.PRECISE,
    extra: {
      icon: 'i-fancy-controller-curve-precise',
    },
  },
  {
    label: t('profile_mode.joystick_curves.steady'),
    value: DSEJoystickProfilePreset.STEADY,
    extra: {
      icon: 'i-fancy-controller-curve-steady',
    },
  },
  {
    label: t('profile_mode.joystick_curves.digital'),
    value: DSEJoystickProfilePreset.DIGITAL,
    extra: {
      icon: 'i-fancy-controller-curve-digital',
    },
  },
  {
    label: t('profile_mode.joystick_curves.dynamic'),
    value: DSEJoystickProfilePreset.DYNAMIC,
    extra: {
      icon: 'i-fancy-controller-curve-dynamic',
    },
  },
  {
    label: t('profile_mode.joystick_curves.custom'),
    value: DSEJoystickProfilePreset.CUSTOM,
    extra: {
      icon: 'i-mingcute-settings-2-line',
    },
  },
])

const adjustment = ref(0)
const deadzone = ref(0)

const currentCurvePresetId = shallowRef(modelValue.value.preset)

const currentCurvePreset = computed(() => {
  return DSEJoystickCurveMap[currentCurvePresetId.value]
})

const currentCurve = shallowRef(modelValue.value.curvePoints)

const currentDefaultCurve = computed(() => {
  const preset = DSEJoystickCurveMap[currentCurvePresetId.value]
  return preset.getDefaultCurve(deadzone.value / 100)
})

watch(() => modelValue.value, (newValue) => {
  currentCurvePresetId.value = newValue.preset
  const preset = DSEJoystickCurveMap[newValue.preset]
  deadzone.value = Math.round(preset.getDeadzone(newValue.curvePoints) * 100)
  adjustment.value = preset.getAdjustment(newValue.curvePoints) || 0
}, { immediate: true })

watch(() => [adjustment.value, deadzone.value, currentCurvePresetId.value], (_, [_a, _b, oldCurvePresetId]) => {
  const preset = DSEJoystickCurveMap[currentCurvePresetId.value]
  const oldDeadzoneWidth = currentCurve.value[0] || 0
  const newDeadzone = deadzone.value / 100

  // 自定义曲线缩放
  if (currentCurvePresetId.value === DSEJoystickProfilePreset.CUSTOM && oldCurvePresetId === DSEJoystickProfilePreset.CUSTOM) {
    // 首先将曲线恢复
    const widthFactor = 1 - oldDeadzoneWidth / 255
    const originalCurve = currentCurve.value.map((value, index) => {
      if (index % 2 === 1) {
        return value
      }
      return Math.round((value - oldDeadzoneWidth) / widthFactor)
    })

    const points = originalCurve.map((value, index) => {
      return new DSEJoystickCurvePos(value, { a: index % 2 === 0 })
    })

    // 重新计算曲线
    const newCurve = points.map((point) => {
      return point.getValue(newDeadzone)
    })

    currentCurve.value = reactive(newCurve)
    modelValue.value = {
      preset: DSEJoystickProfilePreset.CUSTOM,
      curvePoints: newCurve,
    }
    return
  }

  // 正常曲线
  currentCurve.value = preset.getCurve(newDeadzone, adjustment.value)
  modelValue.value = {
    preset: currentCurvePresetId.value,
    curvePoints: currentCurve.value,
  }
})

function handleUpdateCurve(newCurve: number[]) {
  currentCurve.value = newCurve
  modelValue.value = {
    preset: DSEJoystickProfilePreset.CUSTOM,
    curvePoints: newCurve,
  }
}

const throttleUpdateCurve = useThrottleFn(handleUpdateCurve, 16, true)
</script>

<template>
  <div class="wrapper flex-col md:flex-row">
    <div class="flex flex-col items-start gap-2">
      <div class="field">
        <label>{{ $t("profile_mode.joystick_curves_label") }}</label>
        <DouSelect v-model="currentCurvePresetId" :options="curveOptions" class="w-30">
          <template #default="{ label, extra, value }">
            <div class="flex items-center gap-2">
              <div :class="extra?.icon" />
              <span>{{ label }}</span>
              <Tooltip v-if="value === DSEJoystickProfilePreset.CUSTOM" :delay="0">
                <div class="i-mingcute-alert-fill cursor-help text-orange pointer-events-auto" />
                <template #popper>
                  <div class="max-w-200px">{{ $t("profile_mode.custom_joystick_curve_tips") }}</div>
                </template>
              </Tooltip>
            </div>
          </template>
        </DouSelect>
      </div>
      <div class="field" :class="{
        disabled: !currentCurvePreset.curveParams.adjustment,
      }">
        <label>{{ $t("profile_mode.joystick_curves_adjust_label") }}</label>
        <div class="w-40 py-2">
          <SliderBox v-model="adjustment" :min="-5" :max="5" :start-point="0"
            :disabled="!currentCurvePreset.curveParams.adjustment" />
        </div>
      </div>
      <div class="field">
        <label>{{ $t("profile_mode.joystick_deadzone_adjust_label") }}</label>
        <div class="w-40 py-2">
          <SliderBox v-model="deadzone" :min="0" :max="30">
            <template #default="{ value }">
              {{ value }}%
            </template>
          </SliderBox>
        </div>
      </div>
    </div>

    <JoystickCurveGraph :default-curve="currentDefaultCurve" :current="current" :deadzone="deadzone / 100"
      :curve="currentCurve" class="h-auto max-w-400px min-w-0 w-full flex-shrink"
      :editable="currentCurvePresetId === DSEJoystickProfilePreset.CUSTOM" @update-curve="throttleUpdateCurve" />
    <div class="min-w-0 w-full flex flex-shrink flex-grow">
      <JoystickPreviewGraph class="max-w-200px flex-shrink-0 flex-grow" :deadzone="deadzone / 100" :x="x" :y="y"
        :final-x="finalX" :final-y="finalY" />
      <div class="legend min-w-0 flex-shrink overflow-hidden">
        <div class="legend-item">
          <div class="color-box" :style="{ backgroundColor: colorPalette.primary }" />
          <span :style="{ color: colorPalette.primary }">{{ $t('profile_mode.joystick_preview_raw_input') }}</span>
        </div>
        <div class="legend-item">
          <div class="color-box" :style="{ backgroundColor: colorPalette.active }" />
          <span :style="{ color: colorPalette.active }">{{ $t('profile_mode.joystick_preview_mapped_input') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.legend {
  @apply flex-shrink min-w-0 overflow-hidden;

  .legend-item {
    @apply min-w-0 flex items-center gap-1;
  }

  .color-box {
    @apply w-3 h-3 rounded-md flex-shrink-0;
  }

  span {
    @apply min-w-0 text-xs select-none text-ellipsis overflow-hidden whitespace-nowrap;
  }
}

label {
  @apply text-sm text-primary select-none;
}

.disabled {
  @apply filter-grayscale-100;
}

.field {
  @apply flex flex-col gap-1 relative z-10;
}

.wrapper {
  @apply flex gap-5 w-full justify-between;
}
</style>
