<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  dataView: ArrayBuffer
  trigger?: any
}>()

const finalReport = computed(() => {
  // eslint-disable-next-line ts/no-unused-expressions
  props.trigger
  if (!props.dataView)
    return ''
  const dv = props.dataView
  const arr = new Uint8Array(dv)
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
  <div>
    <pre
      class="block max-h-80vh w-full resize-none overflow-auto whitespace-pre-wrap dou-sc-autoborder rounded-2xl bg-transparent p-1"
      @click="handleClick"
    ><span v-for="code, index of finalReport" :key="index" :data-index="index" class="inline-block cursor-pointer font-mono" :title="`${index}`">{{ code }} </span></pre>
    <div v-if="binBit" class="dou-sc-autoborder rounded-2xl p-1 p-1 font-mono">
      current Index: {{ currentIndex }}
      <p class="tracking-widest font-mono">
        {{ binBit }}
      </p>
    </div>
  </div>
</template>

<style scoped>

</style>
