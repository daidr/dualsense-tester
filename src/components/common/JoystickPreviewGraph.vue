<script setup lang="ts">
import { useThrottleFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { Application, Graphics } from 'pixi.js'
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { usePageStore } from '@/store/page'

const props = defineProps<{
  deadzone: number
  x: number
  y: number
  finalX: number
  finalY: number
}>()

const CanvasRef = useTemplateRef('CanvasRef')

const pageStore = usePageStore()

const { colorPalette } = storeToRefs(pageStore)
const initialized = ref(true)

onMounted(async () => {
  if (!CanvasRef.value) {
    return
  }
  let isDisposed = false
  const app = new Application()
  onBeforeUnmount(() => {
    isDisposed = true
    app.destroy({
      removeView: true,
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

  const outline = new Graphics()
  const deadzone = new Graphics()
  const rawInput = new Graphics()
  const finalInput = new Graphics()

  app.stage.addChild(outline)
  app.stage.addChild(deadzone)
  app.stage.addChild(rawInput)
  app.stage.addChild(finalInput)
  const PADDING = 4
  const DOUBLE_PADDING = PADDING * 2

  let prevContext = {
    width: 0,
    height: 0,
    deadzone: 0,
    x: 0,
    y: 0,
    finalX: 0,
    finalY: 0,
    colorMode: '',
  }

  function drawOutline(x: number, y: number, r: number) {
    outline.clear()
    outline.setStrokeStyle({
      color: colorPalette.value.primary,
      width: 1.5,
      alpha: 0.4,
    })
    outline.circle(x, y, r)
    outline.stroke()
  }

  function drawDeadzone(x: number, y: number, r: number, value: number) {
    deadzone.clear()
    if (value <= 0) {
      return
    }
    deadzone.setFillStyle({
      color: colorPalette.value.primary,
      alpha: 0.2,
    })
    deadzone.setStrokeStyle({
      color: colorPalette.value.primary,
      alpha: 0.3,
    })
    deadzone.circle(x, y, r * value)
    deadzone.fill()
    deadzone.stroke()
  }

  function drawInput(input: Graphics, x: number, y: number, endX: number, endY: number, color: string) {
    input.clear()
    input.setFillStyle({
      color,
    })
    input.circle(x, y, 4)
    input.fill()
    input.circle(endX, endY, 4)
    input.fill()
    input.setStrokeStyle({
      color,
      width: 3,
    })

    input.moveTo(x, y)
    input.lineTo(endX, endY)
    input.stroke()
  }

  function draw() {
    if (isDisposed) {
      return
    }
    const { width, height } = app.screen

    const basicChanged = prevContext.width !== width || prevContext.height !== height || prevContext.colorMode !== pageStore.colorModeState
    const deadzoneChanged = prevContext.deadzone !== props.deadzone

    const realWidth = width - DOUBLE_PADDING
    const realHeight = height - DOUBLE_PADDING

    const centerX = realWidth / 2 + PADDING

    const centerY = realHeight / 2 + PADDING

    const radius = Math.min(realWidth, realHeight) / 2

    // 检查是否需要重绘外框
    if (basicChanged) {
      drawOutline(centerX, centerY, radius)
    }

    // 检查是否需要重绘死区
    if (basicChanged || deadzoneChanged) {
      drawDeadzone(centerX, centerY, radius, props.deadzone)
    }

    // 检查是否需要重绘原始输入
    if (basicChanged || prevContext.x !== props.x || prevContext.y !== props.y) {
      const endX = centerX + props.x * radius
      const endY = centerY + props.y * radius
      drawInput(rawInput, centerX, centerY, endX, endY, colorPalette.value.primary)
    }

    // 检查是否需要重绘激活输入
    if (basicChanged || prevContext.finalX !== props.finalX || prevContext.finalY !== props.finalY) {
      const endX = centerX + props.finalX * radius
      const endY = centerY + props.finalY * radius
      drawInput(finalInput, centerX, centerY, endX, endY, colorPalette.value.active)
    }

    prevContext = {
      width,
      height,
      deadzone: props.deadzone,
      x: props.x,
      y: props.y,
      finalX: props.finalX,
      finalY: props.finalY,
      colorMode: pageStore.colorModeState,
    }
  }

  const throttledDraw = useThrottleFn(draw, 16, true)

  app.renderer.on('resize', () => {
    throttledDraw()
  })

  watch(
    () => [props.x, props.y, props.finalX, props.finalY, props.deadzone, pageStore.colorModeState],
    () => {
      throttledDraw()
    },
    { immediate: true },
  )

  app.ticker.addOnce(() => {
    nextTick(() => {
      initialized.value = true
    })
  })
})
</script>

<template>
  <div class="relative aspect-[1/1] overflow-hidden transition-opacity duration-300" :style="{
    opacity: initialized ? 1 : 0,
  }">
    <canvas ref="CanvasRef" class="absolute top-0 h-full w-full" w="1" h="1" />
  </div>
</template>

<style scoped></style>
