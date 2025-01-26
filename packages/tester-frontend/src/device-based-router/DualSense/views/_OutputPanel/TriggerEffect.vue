<script setup lang="ts">
import SelectBox from '@/components/common/SelectBox.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SliderBox from '@/components/common/SliderBox.vue';
import type { OutputStruct } from './outputStruct';

const props = withDefaults(defineProps<{
  is?: "left" | "right";
  struct: OutputStruct
}>(), {
  is: "left"
})

const { t } = useI18n()

const triggerModeSets = computed(() => {
  return [
    {
      value: 0x00,
      label: t('output_panel.trigger_mode.off')
    },
    {
      value: 0x01,
      label: t('output_panel.trigger_mode.resistance')
    },
    {
      value: 0x02,
      label: t('output_panel.trigger_mode.trigger')
    },
    {
      value: 0x06,
      label: t('output_panel.trigger_mode.auto_trigger')
    },
  ]
})

const EFFECT_SETTING: Record<number, string[]> = {
  // off
  0x00: [],
  // resistance
  0x01: ['start_pos', 'force'],
  // soft trigger
  0x02: ['start_pos', 'end_pos', 'force'],
  // automatic trigger
  0x06: ['start_pos', 'force', 'frequency']
}

const startpos = ref(0)
const endpos = ref(0)
const force = ref(0)
const frequency = ref(0)

const currentTriggerEffect = computed({
  get: () => {
    if (props.is === 'left') {
      return props.struct.adaptiveTriggerLeftMode.value
    } else {
      return props.struct.adaptiveTriggerRightMode.value
    }
  },
  set: (v) => {
    if (props.is === 'left') {
      props.struct.adaptiveTriggerLeftMode.value = v
    } else {
      props.struct.adaptiveTriggerRightMode.value = v
    }
  }
})

const currentTriggerEffectData = computed({
  get: () => {
    // no need to get value
    return [] as number[]
  },
  set: (v) => {
    let side: 'Left' | 'Right' = 'Left'
    if (props.is === 'right') {
      side = 'Right'
    }
    for (let i = 0; i < 10; i++) {
      const _i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = i as any
      props.struct[`adaptiveTrigger${side}Param${_i}`].value = v[i] ?? 0
    }
  }
})

const emit = defineEmits<{
  effectUpdate: []
}>()

watch([currentTriggerEffect, startpos, endpos, force, frequency], () => {
  switch (currentTriggerEffect.value) {
    case 0x01:
      currentTriggerEffectData.value = [startpos.value, force.value]
      break;
    case 0x02:
      currentTriggerEffectData.value = [startpos.value, endpos.value, force.value]
      break;
    case 0x06:
      currentTriggerEffectData.value = [frequency.value, force.value, startpos.value,]
      break;
    default:
      currentTriggerEffectData.value = []
      break;
  }
  emit('effectUpdate')
})

watch(currentTriggerEffect, () => {
  switch (currentTriggerEffect.value) {
    case 0x01:
      // resistance
      startpos.value = 40
      force.value = 230
      break;
    case 0x02:
      // trigger
      startpos.value = 15
      endpos.value = 100
      force.value = 255
      break;
    case 0x06:
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
