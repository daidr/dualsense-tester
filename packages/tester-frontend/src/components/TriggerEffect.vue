<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import SelectBox from './common/SelectBox.vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SliderBox from './common/SliderBox.vue';

const props = withDefaults(defineProps<{
    is: "left" | "right";
}>(), {
    is: "left"
})

const { t } = useI18n()

const dualsenseStore = useDualSenseStore()

const triggerModeSets = computed(() => {
    return [
        {
            value: 0,
            label: t('output_panel.trigger_mode.off')
        },
        {
            value: 1,
            label: t('output_panel.trigger_mode.resistance')
        },
        {
            value: 2,
            label: t('output_panel.trigger_mode.trigger')
        },
        {
            value: 3,
            label: t('output_panel.trigger_mode.auto_trigger')
        },
    ]
})

const EFFECT_SETTING: Record<number, string[]> = {
    0: [],
    1: ['start_pos', 'force'],
    2: ['start_pos', 'end_pos', 'force'],
    3: ['start_pos', 'force', 'frequency']
}

const startpos = ref(0)
const endpos = ref(0)
const force = ref(0)
const frequency = ref(0)

const currentTriggerEffect = computed({
    get: () => {
        if (props.is === 'left') {
            return dualsenseStore.output.leftTriggerEffect
        } else {
            return dualsenseStore.output.rightTriggerEffect
        }
    },
    set: (v) => {
        if (props.is === 'left') {
            dualsenseStore.output.leftTriggerEffect = v
        } else {
            dualsenseStore.output.rightTriggerEffect = v
        }
    }
})

const currentTriggerEffectData = computed({
    get: () => {
        if (props.is === 'left') {
            return dualsenseStore.output.leftTriggerEffectData
        } else {
            return dualsenseStore.output.rightTriggerEffectData
        }
    },
    set: (v) => {
        if (props.is === 'left') {
            dualsenseStore.output.leftTriggerEffectData = v
        } else {
            dualsenseStore.output.rightTriggerEffectData = v
        }
    }
})

watch([startpos, endpos, force, frequency], () => {
    switch (currentTriggerEffect.value) {
        case 1:
            currentTriggerEffectData.value = [startpos.value, force.value]
            break;
        case 2:
            currentTriggerEffectData.value = [startpos.value, endpos.value, force.value]
            break;
        case 3:
            currentTriggerEffectData.value = [startpos.value, force.value, frequency.value]
            break;
        default:
            currentTriggerEffectData.value = []
            break;
    }
})

watch(currentTriggerEffect, () => {
    switch (currentTriggerEffect.value) {
        case 1:
            // resistance
            startpos.value = 40
            force.value = 230
            break;
        case 2:
            // trigger
            startpos.value = 15
            endpos.value = 100
            force.value = 255
            break;
        case 3:
            // automatic trigger
            startpos.value = 20
            force.value = 255
            frequency.value = 10
            break;
    }
}, {
    immediate: true
})
</script>

<template>
    <tr>
        <td class="label">{{ $t(`output_panel.${is}_trigger_mode`) }}</td>
        <td class="value">
            <div>
                <SelectBox v-model="currentTriggerEffect" :options="triggerModeSets" />
            </div>
        </td>
    </tr>
    <tr v-if="EFFECT_SETTING[currentTriggerEffect].includes('start_pos')">
        <td class="label">{{ $t('output_panel.trigger_values.start_pos') }}</td>
        <td class="value">
            <SliderBox class="w-full" :min="0" :max="255" v-model="startpos" />
        </td>
    </tr>
    <tr v-if="EFFECT_SETTING[currentTriggerEffect].includes('end_pos')">
        <td class="label">{{ $t('output_panel.trigger_values.end_pos') }}</td>
        <td class="value">
            <SliderBox class="w-full" :min="0" :max="255" v-model="endpos" />
        </td>
    </tr>
    <tr v-if="EFFECT_SETTING[currentTriggerEffect].includes('force')">
        <td class="label">{{ $t('output_panel.trigger_values.force') }}</td>
        <td class="value">
            <SliderBox class="w-full" :min="0" :max="255" v-model="force" />
        </td>
    </tr>
    <tr v-if="EFFECT_SETTING[currentTriggerEffect].includes('frequency')">
        <td class="label">{{ $t('output_panel.trigger_values.frequency') }}</td>
        <td class="value">
            <SliderBox class="w-full" :min="0" :max="15" v-model="frequency" />
        </td>
    </tr>
</template>

<style scoped lang="scss">
.separator {
    @apply dou-sc-autobg w-full h-3px rounded-full;
}
</style>
