<script setup lang="ts">
import { Graphics } from 'pixi.js'
import { nextTick, onMounted, ref, toRaw, useTemplateRef, watch, watchEffect } from 'vue'
import { useIsRTL } from '@/store/page'
import { usePixiApp } from '@/utils/pixi.util'
import SliderBox from './SliderBox.vue'

const { maxValue = 0x7FFF, value } = defineProps<{
  maxValue?: number
  value: {
    x: number
    y: number
    z: number
  }
}>()

const isRTL = useIsRTL()
let isRTLwithoutTrack = isRTL.value
const initialized = ref(true)

watch(() => isRTL.value, (isRTL) => {
  isRTLwithoutTrack = isRTL
})

const CanvasRef = useTemplateRef('CanvasRef')

const X_COLOR = '#2f81f7'
const Y_COLOR = '#f14c4c'
const Z_COLOR = '#f9aa53'
const MAX_COUNT = 700

const factor = ref(1)

let currentMaxValue = maxValue
let currentYStepFactor = 2 * currentMaxValue + 1

watchEffect(() => {
  currentMaxValue = maxValue * factor.value
  currentYStepFactor = 2 * currentMaxValue + 1
})

let valueList: {
  x: number
  y: number
  z: number
}[] = []

watch(() => value, (value) => {
  if (!value) {
    return
  }
  valueList.push(value)
  if (valueList.length > MAX_COUNT) {
    valueList.shift()
  }
}, {
  immediate: true,
})

onMounted(async () => {
  if (!CanvasRef.value) {
    return
  }
  const { isDisposed, app } = await usePixiApp(CanvasRef.value)
  if (isDisposed.value) {
    return
  }

  const lineX = new Graphics()
  const lineY = new Graphics()
  const lineZ = new Graphics()
  lineX.setStrokeStyle({
    color: X_COLOR,
    width: 1,
    alpha: 0.9,
  })
  lineY.setStrokeStyle({
    color: Y_COLOR,
    width: 1,
    alpha: 0.9,
  })
  lineZ.setStrokeStyle({
    color: Z_COLOR,
    width: 1,
    alpha: 0.9,
  })

  app.stage.addChild(lineX, lineY, lineZ)

  app.ticker.add(() => {
    const { width, height } = app.screen
    const _values = toRaw(valueList).slice()
    const xStep = width / MAX_COUNT
    const initialY = height / 2
    const yStep = height / currentYStepFactor
    const rest = MAX_COUNT - _values.length
    lineX.clear()
    lineY.clear()
    lineZ.clear()

    for (let i = 0; i < _values.length; ++i) {
      const item = _values[i]
      const x = isRTLwithoutTrack ? width - (rest + i) * xStep : (rest + i) * xStep
      const yX = initialY - item.x * yStep
      const yY = initialY - item.y * yStep
      const yZ = initialY - item.z * yStep
      if (i === 0) {
        lineX.moveTo(x, yX)
        lineY.moveTo(x, yY)
        lineZ.moveTo(x, yZ)
      }
      else {
        lineX.lineTo(x, yX)
        lineY.lineTo(x, yY)
        lineZ.lineTo(x, yZ)
      }
    }
    lineX.stroke()
    lineY.stroke()
    lineZ.stroke()
  })

  app.ticker.addOnce(() => {
    nextTick(() => {
      initialized.value = true
    })
  })
})

function reset() {
  valueList = []
}

defineExpose({
  reset,
})
</script>

<template>
  <div class="relative">
    <div
      class="relative h-full w-[calc(100%-30px)] overflow-hidden dou-sc-colorborder rounded-xl transition-opacity duration-300" :style="{
        opacity: initialized ? 1 : 0,
      }"
    >
      <canvas ref="CanvasRef" class="absolute top-0 h-full w-full" w="1" h="1" />
    </div>
    <div class="absolute end-2 bottom-0 top-0">
      <SliderBox v-model="factor" :min="0.01" :max="1" :digits="3" :vertical="true" />
    </div>
  </div>
</template>

<style scoped></style>
