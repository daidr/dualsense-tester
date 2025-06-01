<script setup lang="ts">
import { Tooltip } from 'floating-vue'
import { computed } from 'vue'
import DouNumberInput from '@/components/base/DouNumberInput.vue'
import ControllerTextButton from '@/components/common/ControllerTextButton.vue'
import TriggerLimitGraph from '@/components/common/TriggerLimitGraph.vue'

const { current = 0, realCurrent = 0, side = 'left' } = defineProps<{
  current?: number
  realCurrent?: number
  side?: 'left' | 'right' | 'unified'
}>()

const min = defineModel<number>('min', {
  default: 0,
})

const max = defineModel<number>('max', {
  default: 100,
})

const buttonText = computed(() => {
  return side === 'left' ? 'L2' : 'R2'
})
</script>

<template>
  <div class="flex flex-shrink-0 gap-3">
    <TriggerLimitGraph v-if="side === 'right'" :min="min" :max="max" :current="current" direction="right"
      class="h-auto max-h-300px flex-grow <sm:hidden" />
    <div class="flex flex-col items-start gap-2">
      <div class="flex items-center gap-2">
        <div>
          <i18n-t keypath="profile_mode.trigger_deadzone.input_range" scope="global">
            <template #key>
              <ControllerTextButton v-if="side !== 'unified'" :text="buttonText" small />
            </template>
          </i18n-t>
        </div>
        <Tooltip v-if="min !== 0 || max !== 100" :delay="0">
          <div class="i-mingcute-alert-fill cursor-help text-xl text-orange" />

          <template #popper>
            <i18n-t keypath="profile_mode.trigger_deadzone.limit_tip" scope="global" tag="div" class="max-w-200px">
              <template #key>
                <template v-if="side === 'unified'">
                  <ControllerTextButton text="L2" small /> /
                  <ControllerTextButton text="R2" small />
                </template>
                <ControllerTextButton v-else :text="buttonText" small />
              </template>
            </i18n-t>
          </template>
        </Tooltip>
      </div>
      <div>
        <div class="text-sm text-primary">
          {{ $t('profile_mode.trigger_deadzone.range_from') }}
        </div>
        <DouNumberInput v-model="min" :min="0" :max="max - 1" />
      </div>
      <div>
        <div class="text-sm text-primary">
          {{ $t('profile_mode.trigger_deadzone.range_to') }}
        </div>
        <DouNumberInput v-model="max" :min="min + 1" :max="100" />
      </div>
      <div class="w-full flex justify-between text-primary">
        <span>{{ $t('profile_mode.trigger_deadzone.deadzone_preview') }}</span>
        <span class="font-mono">{{ realCurrent }}</span>
      </div>
    </div>
    <TriggerLimitGraph v-if="side === 'left' || side === 'unified'" :min="min" :max="max" :current="current"
      direction="left" class="h-auto max-h-300px flex-grow <sm:hidden" />
  </div>
</template>

<style scoped lang="scss"></style>
