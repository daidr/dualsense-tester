<script setup lang="ts">
import DouNumberInput from '@/components/base/DouNumberInput.vue';
import ControllerTextButton from '@/components/common/ControllerTextButton.vue';
import TriggerLimitGraph from '@/components/common/TriggerLimitGraph.vue';
import { Tooltip } from 'floating-vue';
import { computed } from 'vue';

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
    <div class="flex gap-3 flex-shrink-0">
        <TriggerLimitGraph v-if="side === 'right'" :min="min" :max="max" :current="current" direction="right"
            class="flex-grow h-auto max-h-300px <sm:hidden" />
        <div class="flex flex-col items-start gap-3">
            <div class="flex items-center gap-3">
                <div>
                    <i18n-t keypath="profile_mode.trigger_deadzone.input_range" scope="global">
                        <template #key>
                            <ControllerTextButton v-if="side !== 'unified'" :text="buttonText" small />
                        </template>
                    </i18n-t>
                </div>
                <Tooltip :delay="0" v-if="min !== 0 || max !== 100">
                    <div class="i-mingcute-alert-line cursor-help"></div>

                    <template #popper>
                        <i18n-t keypath="profile_mode.trigger_deadzone.limit_tip" scope="global" tag="div" class="max-w-200px">
                            <template #key>
                                <ControllerTextButton v-if="side !== 'unified'" :text="buttonText" small />
                            </template>
                        </i18n-t>
                    </template>
                </Tooltip>
            </div>
            <div>
                <div class="text-sm">{{ $t('profile_mode.trigger_deadzone.range_from') }}</div>
                <DouNumberInput :min="0" :max="max - 1" v-model="min" />
            </div>
            <div>
                <div class="text-sm">{{ $t('profile_mode.trigger_deadzone.range_to') }}</div>
                <DouNumberInput :min="min + 1" :max="100" v-model="max" />
            </div>
            <div class="flex justify-between w-full">
                <span>{{ $t('profile_mode.trigger_deadzone.deadzone_preview') }}</span>
                <span class="font-mono">{{ realCurrent }}</span>
            </div>
        </div>
        <TriggerLimitGraph v-if="side === 'left' || side === 'unified'" :min="min" :max="max" :current="current"
            direction="left" class="flex-grow h-auto max-h-300px <sm:hidden" />
    </div>
</template>

<style scoped lang="scss"></style>
