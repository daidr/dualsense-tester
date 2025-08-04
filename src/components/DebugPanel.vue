<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDualSenseStore } from '@/store/dualsense'
import GeneralContainer from './common/GeneralContainer.vue'
import HexPreview from './common/HexPreview.vue'

const { inputReport, inputReportId } = storeToRefs(useDualSenseStore())
</script>

<template>
  <GeneralContainer title="Debug" tag="dev-only">
    <span>ReportId: {{ inputReportId }} (0x{{ inputReportId?.toString(16).padStart(2, '0') }})</span>
    <HexPreview v-if="inputReport" :data-view="inputReport.buffer" />
  </GeneralContainer>
</template>

<style scoped></style>
