<script setup lang="ts">
import { Application, Graphics } from 'pixi.js'
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { usePageStore } from '@/store/page'

const props = defineProps<{
  defaultCurve: number[]
  curve: number[]
  deadzone: number
  current: number
}>()

const CanvasRef = useTemplateRef('CanvasRef')

const pageStore = usePageStore()

const colorPalette = computed(() => {
  if (pageStore.colorModeState === 'dark') {
    return {
      normal: '#ffffff',
      background: '#000000',
      primary: '#2f81f7',
    }
  }
  return {
    normal: '#000000',
    background: '#ffffff',
    primary: '#2f81f7',
  }
})

onMounted(async () => {
  if (!CanvasRef.value) {
    return
  }
  let isDisposed = false
  const app = new Application()
  onBeforeUnmount(() => {
    isDisposed = true
    app.destroy({
      removeView: false,
    })
  })
  await app.init({
    preference: 'webgl',
    canvas: CanvasRef.value,
    resizeTo: CanvasRef.value,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
  })
  if (isDisposed) {
    return
  }

  const grid = new Graphics()
  const deadzone = new Graphics()
  const defaultCurve = new Graphics()
  const currentCurve = new Graphics()

  app.stage.addChild(grid)
  app.stage.addChild(deadzone)
  app.stage.addChild(defaultCurve)
  app.stage.addChild(currentCurve)

  function drawGrid(x: number, y: number, w: number, h: number) {
    grid.clear()
    // 绘制 4 * 4 网格
    const gridWidth = w / 4
    const gridHeight = h / 4

    grid.setStrokeStyle({
      color: colorPalette.value.primary,
      width: 1,
      alpha: 0.3,
    })
    for (let i = 1; i <= 3; i++) {
      const xPos = x + i * gridWidth
      const yPos = y + i * gridHeight
      grid.moveTo(xPos, y)
      grid.lineTo(xPos, y + h)
      grid.moveTo(x, yPos)
      grid.lineTo(x + w, yPos)
    }
    grid.stroke()
  }

  function drawDeadzone(w: number, h: number) {
    deadzone.clear()
    if (w <= 0) {
      return
    }
    deadzone.setFillStyle({
      color: colorPalette.value.background,
      alpha: 1,
    })
    deadzone.rect(0, 0, w, h)
    deadzone.fill()
    deadzone.setFillStyle({
      color: colorPalette.value.primary,
      alpha: 0.2,
    })
    deadzone.rect(0, 0, w, h)
    deadzone.fill()
  }

  function drawCurve(graphics: Graphics, x: number, y: number, w: number, h: number, curve: number[], color = '#fff', alpha = 1) {
    graphics.clear()
    if (curve.length === 0) {
      return
    }
    // curve 的点都是 0-255 区间的, 这里需要算出真实坐标
    const realCurve = curve.map((point, index) => {
      if (index % 2) {
        return (255 - point) / 255 * h
      } else {
        return point / 255 * w
      }
    })

    function draw() {
      graphics.moveTo(x + realCurve[0], y + realCurve[1])
      for (let i = 2; i < realCurve.length; i += 2) {
        graphics.lineTo(x + realCurve[i], y + realCurve[i + 1])
      }
      // 确保曲线到达右上角
      graphics.lineTo(x + w, y)
    }

    graphics.setStrokeStyle({
      color: colorPalette.value.background,
      width: 3,
      alpha: 1,
      join: 'round',
      cap: 'round',
    })
    draw()
    graphics.stroke()

    graphics.setStrokeStyle({
      color,
      width: 3,
      alpha,
      join: 'round',
      cap: 'round',
    })
    draw()
    graphics.stroke()
  }

  let prevContext = {
    width: 0,
    height: 0,
    deadzone: 0,
    curve: [0],
    defaultCurve: [0],
    current: 0,
    colorMode: ''
  }

  function draw() {
    if (isDisposed) {
      return
    }
    const { width, height } = app.screen

    const basicChanged = prevContext.width !== width || prevContext.height !== height || prevContext.colorMode !== pageStore.colorModeState
    const deadzoneChanged = prevContext.deadzone !== props.deadzone


    // 检查是否需要重绘网格
    if (basicChanged) {
      drawGrid(0, 0, width, height)
    }

    // 检查是否需要重绘死区
    if (basicChanged || deadzoneChanged) {
      const gridX = props.deadzone * width
      drawDeadzone(gridX, height)
    }

    // 检查是否需要重绘默认曲线
    if (basicChanged || prevContext.defaultCurve !== props.defaultCurve) {
      drawCurve(defaultCurve, 0, 0, width, height, props.defaultCurve, colorPalette.value.primary, 0.2)
    }

    // 检查是否需要重绘当前曲线
    if (basicChanged || prevContext.curve !== props.curve) {
      drawCurve(currentCurve, 0, 0, width, height, props.curve, colorPalette.value.primary, 0.6)
    }

    prevContext = {
      width,
      height,
      deadzone: props.deadzone,
      curve: props.curve,
      defaultCurve: props.defaultCurve,
      current: props.current,
      colorMode: pageStore.colorModeState,
    }
  }

  app.renderer.on('resize', () => {
    draw()
  })

  watch(
    () => [props.curve, props.defaultCurve, props.deadzone, props.current, pageStore.colorModeState],
    () => {
      draw()
    },
    { immediate: true },
  )
})
</script>

<template>
  <div class="relative aspect-[2/1] overflow-hidden rounded-xl dou-sc-colorborder">
    <canvas ref="CanvasRef" class="absolute top-0 h-full w-full" w="1" h="1" />
  </div>
</template>

<style scoped></style>
