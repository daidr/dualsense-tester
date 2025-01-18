<script setup lang="ts">
import { computed } from 'vue';
import LabeledValue from './LabeledValue.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    label: string
    value: string
    valueLocalePrefix?: string
}>()

const i18n = useI18n()

const finalValue = computed(() => {
    if (props.valueLocalePrefix) {
        return `${props.valueLocalePrefix}.${props.value}`
    }
    return props.value
})

const finalLabel = computed(() => {
    return i18n.t(props.label)
})

function test(str: string) {
    console.log('test')
    return i18n.t(str)
}
</script>

<template>
<LabeledValue :label="finalLabel">
    <span class="w-full">{{ valueLocalePrefix ? $t(finalValue) : finalValue }}</span>
</LabeledValue>
</template>

<style scoped>

</style>