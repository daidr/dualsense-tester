<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import LocaleLabeledValue from './common/LocaleLabeledValue.vue';
import { storeToRefs } from 'pinia';

const { inputSeqNum } = storeToRefs(useDualSenseStore())
</script>

<template>
    <LocaleLabeledValue :value="inputSeqNum.toString()" label="connect_panel.seq_num" />
</template>

<style scoped>

</style>