<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  analyser: AnalyserNode | null
  active?: boolean
}>()

const BAR_COUNT = 40

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
let raf = 0
let freqData: Uint8Array<ArrayBuffer> | null = null

function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  return dpr
}

function draw() {
  const canvas = canvasRef.value
  const analyser = props.analyser
  if (!canvas || !analyser) {
    raf = 0
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    raf = 0
    return
  }

  const dpr = resizeCanvas(canvas)
  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)

  const bins = analyser.frequencyBinCount
  if (!freqData || freqData.length !== bins) {
    freqData = new Uint8Array(bins)
  }
  analyser.getByteFrequencyData(freqData)

  // 取低-中频段（前 70% bins）映射到固定数量的柱子
  const usable = Math.floor(bins * 0.7)
  const step = usable / BAR_COUNT
  const gap = 2 * dpr
  const barWidth = (width - gap * (BAR_COUNT - 1)) / BAR_COUNT
  const color = getComputedStyle(canvas).color || '#3b82f6'
  ctx.fillStyle = color

  for (let i = 0; i < BAR_COUNT; i++) {
    let sum = 0
    const from = Math.floor(i * step)
    const to = Math.max(from + 1, Math.floor((i + 1) * step))
    for (let j = from; j < to; j++) {
      sum += freqData[j]
    }
    const value = sum / (to - from) / 255 // 0..1
    const barHeight = Math.max(value * height, dpr)
    const x = i * (barWidth + gap)
    const y = height - barHeight
    const radius = Math.min(barWidth / 2, 2 * dpr)
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barHeight, radius)
    ctx.fill()
  }

  raf = requestAnimationFrame(draw)
}

function startDraw() {
  if (raf || !props.analyser) {
    return
  }
  raf = requestAnimationFrame(draw)
}

function stopDraw() {
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  // 清空画布
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

watch(() => [props.active, props.analyser] as const, ([active, analyser]) => {
  if (active && analyser) {
    startDraw()
  }
  else {
    stopDraw()
  }
})

// 条件挂载（仅播放时显示）时，挂载即处于激活态，watch 不会触发，这里补一次启动。
onMounted(() => {
  if (props.active && props.analyser) {
    startDraw()
  }
})

onBeforeUnmount(stopDraw)
</script>

<template>
  <canvas ref="canvasRef" class="spectrum text-primary" />
</template>

<style scoped lang="scss">
.spectrum {
  @apply w-full h-10 block;
}
</style>
