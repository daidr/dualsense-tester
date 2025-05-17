<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import GeneralContainer from './common/GeneralContainer.vue'

const { inputReport, inputReportId } = storeToRefs(useDualSenseStore())
// inputReport is a ref of dataview
const finalReport = computed(() => {
  if (!inputReport.value)
    return ''
  const dv = inputReport.value
  const arr = new Uint8Array(dv.buffer)
  return arr.reduce<string[]>((acc, val) => {
    acc.push(val.toString(16).padStart(2, '0'))
    return acc
  }, [])
})

const currentIndex = ref(-1)

const binBit = computed(() => {
  if (currentIndex.value === -1 || currentIndex.value >= finalReport.value.length) {
    return ''
  }
  // 输出二进制
  const bit = finalReport.value[currentIndex.value]
  return Number.parseInt(bit, 16).toString(2).padStart(8, '0')
})

function handleClick(event: MouseEvent) {
  const index = Number((event.target as any)?.getAttribute('data-index'))
  if (Number.isNaN(index)) {
    return
  }
  currentIndex.value = index
}
</script>

<template>
  <GeneralContainer title="Debug" tag="dev-only">
    <span>ReportId: {{ inputReportId }} (0x{{ inputReportId?.toString(16).padStart(2, '0') }})</span>
    <pre
      class="block max-h-80vh w-full resize-none overflow-auto whitespace-pre-wrap rounded-2xl bg-transparent p-1 dou-sc-autoborder"
      @click="handleClick"
    ><span v-for="code, index of finalReport" :key="index" :data-index="index" class="inline-block cursor-pointer font-mono" :title="`${index}`">{{ code }} </span></pre>
    <div v-if="binBit" class="rounded-2xl p-1 p-1 font-mono dou-sc-autoborder">
      current Index: {{ currentIndex }}
      <p class="tracking-widest font-mono">
        {{ binBit }}
      </p>
    </div>
  </GeneralContainer>
</template>

<style scoped></style>
