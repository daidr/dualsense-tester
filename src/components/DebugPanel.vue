<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import GeneralContainer from './common/GeneralContainer.vue'
import HexPreview from './common/HexPreview.vue'

const { inputReport, inputReportId } = storeToRefs(useDualSenseStore())


</script>

<template>
  <GeneralContainer title="Debug" tag="dev-only">
    <span>ReportId: {{ inputReportId }} (0x{{ inputReportId?.toString(16).padStart(2, '0') }})</span>
    <HexPreview v-if="inputReport" :dataView="inputReport.buffer" />
  </GeneralContainer>
</template>

<style scoped></style>
