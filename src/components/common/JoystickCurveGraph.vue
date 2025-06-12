<script setup lang="ts">
import type { FederatedPointerEvent } from 'pixi.js'
import { useThrottleFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { Container, Graphics } from 'pixi.js'
import { nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { usePageStore } from '@/store/page'
import { usePixiApp } from '@/utils/pixi.util'

const props = defineProps<{
  defaultCurve: number[]
  curve: number[]
  deadzone: number
  current: number
  editable?: boolean
}>()

const emit = defineEmits<{
  updateCurve: [curve: number[]]
}>()

const CanvasRef = useTemplateRef('CanvasRef')

const pageStore = usePageStore()

const { colorPalette } = storeToRefs(pageStore)
const initialized = ref(false)

onMounted(async () => {
  if (!CanvasRef.value) {
    return
  }
  const { isDisposed, app } = await usePixiApp(CanvasRef.value)
  if (isDisposed.value) {
    return
  }

  const currentPoint = shallowRef<Graphics>()

  const grid = new Graphics()
  const deadzone = new Graphics()
  const defaultCurve = new Graphics()
  const currentCurve = new Graphics()
  const activeCurve = new Graphics()

  function updateCurve(index: number, valueX: number, valueY: number) {
    const newIndex = index + 1
    const newCurve = [...props.curve]
    // 取出第一个点
    const firstPointX = newCurve[0]
    const lastPointX = 255
    const prevPointX = newCurve[(newIndex - 1) * 2] || firstPointX
    const nextPointX = newCurve[(newIndex + 1) * 2] || lastPointX

    newCurve[newIndex * 2] = Math.max(prevPointX, Math.min(nextPointX, valueX))
    newCurve[newIndex * 2 + 1] = Math.max(0, Math.min(255, 255 - valueY))
    emit('updateCurve', newCurve)
  }
  const dragPoints = new Container()
  const dragPointsChildren: Graphics[] = []
  for (let i = 0; i < 3; i++) {
    const point = new Graphics()
    let isDragging = false
    function handlePointerEnter(this: Graphics, e: FederatedPointerEvent) {
      if (currentPoint.value) {
        return
      }
      currentPoint.value = this
    }

    function handlePointerLeave(this: Graphics, e: FederatedPointerEvent) {
      if (!isDragging) {
        currentPoint.value = undefined
      }
    }

    function handlePointerDown(this: Graphics, e: FederatedPointerEvent) {
      isDragging = true
      currentPoint.value = this
    }

    function handlePointerUp(this: Graphics, e: FederatedPointerEvent) {
      isDragging = false
      currentPoint.value = undefined
    }

    function handlePointerMove(this: Graphics, e: FederatedPointerEvent) {
      if (!isDragging) {
        return
      }
      const { x: mouseX, y: mouseY } = e.global
      const { width, height } = app.screen
      updateCurve(i, mouseX / width * 255, mouseY / height * 255)
    }

    point.on('pointerenter', handlePointerEnter)
    point.on('pointerleave', handlePointerLeave)
    point.on('pointerdown', handlePointerDown)
    point.on('pointerup', handlePointerUp)
    point.on('pointerupoutside', handlePointerUp)
    point.on('globalpointermove', handlePointerMove)
    point.eventMode = 'static'
    point.cursor = 'move'
    dragPointsChildren.push(point)
    dragPoints.addChild(point)
  }

  app.stage.addChild(grid)
  app.stage.addChild(deadzone)
  app.stage.addChild(defaultCurve)
  app.stage.addChild(currentCurve)
  app.stage.addChild(activeCurve)
  app.stage.addChild(dragPoints)

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
      }
      else {
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

  function drawActiveCurve(graphics: Graphics, x: number, y: number, w: number, h: number, clipX: number, curve: number[], color = '#fff') {
    graphics.clear()
    if (curve.length === 0 || clipX <= 0) {
      return
    }
    const realCurve = curve.map((point, index) => {
      if (index % 2) {
        return (255 - point) / 255 * h
      }
      else {
        return point / 255 * w
      }
    })

    function draw() {
      graphics.moveTo(x + realCurve[0], y + realCurve[1])
      let i = 2
      while (i < realCurve.length && x + realCurve[i] <= x + clipX) {
        graphics.lineTo(x + realCurve[i], y + realCurve[i + 1])
        i += 2
      }

      if (i < realCurve.length) {
        const prevX = x + realCurve[i - 2]
        const nextX = x + realCurve[i]

        if (prevX < x + clipX && nextX > x + clipX) {
          const t = (clipX - realCurve[i - 2]) / (realCurve[i] - realCurve[i - 2])
          const intersectY = realCurve[i - 1] + t * (realCurve[i + 1] - realCurve[i - 1])
          graphics.lineTo(x + clipX, y + intersectY)
        }
      }
      else if (x + clipX > x + realCurve[realCurve.length - 2]) {
        const lastX = x + realCurve[realCurve.length - 2]
        const lastY = y + realCurve[realCurve.length - 1]

        if (lastX < w) {
          const t = (clipX - lastX) / (w - lastX)
          const finalY = lastY * (1 - t) + y * t // Interpolate from last point to top (y=0)
          graphics.lineTo(x + clipX, finalY)
        }
      }
    }

    graphics.setStrokeStyle({
      color,
      width: 3,
      alpha: 1,
      join: 'round',
      cap: 'round',
    })
    draw()
    graphics.stroke()
  }

  function drawDragPoints(curve: number[], width: number, height: number) {
    dragPointsChildren.forEach((point) => {
      point.clear()
    })
    if (curve.length === 0 || !props.editable) {
      return
    }
    const realCurve = curve.map((point, index) => {
      if (index % 2) {
        return (255 - point) / 255 * height
      }
      else {
        return point / 255 * width
      }
    })

    for (let i = 2; i < realCurve.length; i += 2) {
      const x = realCurve[i]
      const y = realCurve[i + 1]
      const point = dragPointsChildren[i / 2 - 1]
      const isActive = currentPoint.value === point
      point.clear()
      point.setStrokeStyle({
        color: isActive ? colorPalette.value.active : colorPalette.value.primary,
        alpha: 1,
        width: 2,
      })

      point.setFillStyle({
        color: colorPalette.value.background,
        alpha: 1,
      })
      point.circle(x, y, 6)
      point.fill()
      point.stroke()
    }
  }

  let prevContext = {
    width: 0,
    height: 0,
    deadzone: 0,
    curve: [0],
    defaultCurve: [0],
    current: 0,
    colorMode: '',
    editable: false,
    currentPoint: undefined as any,
  }

  function draw() {
    if (isDisposed.value) {
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

    // 检查是否需要重绘激活曲线
    if (basicChanged || prevContext.curve !== props.curve || prevContext.current !== props.current) {
      const finalCurrent = Math.max(0, Math.min(props.current - props.deadzone, 1 - props.deadzone))
      drawActiveCurve(activeCurve, 0, 0, width, height, finalCurrent * width + props.deadzone * width, props.curve, colorPalette.value.active)
    }

    // 检查是否需要绘制操作点
    if (basicChanged || prevContext.curve !== props.curve || prevContext.editable !== props.editable || currentPoint.value !== prevContext.currentPoint) {
      drawDragPoints(props.curve, width, height)
    }

    prevContext = {
      width,
      height,
      deadzone: props.deadzone,
      curve: props.curve,
      defaultCurve: props.defaultCurve,
      current: props.current,
      colorMode: pageStore.colorModeState,
      editable: props.editable || false,
      currentPoint: currentPoint.value,
    }
  }

  const throttledDraw = useThrottleFn(draw, 16, true)

  app.renderer.on('resize', () => {
    throttledDraw()
  })

  watch(
    () => [props.curve, props.defaultCurve, props.deadzone, props.current, props.editable, pageStore.colorModeState, currentPoint.value],
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
  <div
    class="relative aspect-[2/1] overflow-hidden rounded-xl transition-opacity duration-300 dou-sc-colorborder"
    :style="{
      opacity: initialized ? 1 : 0,
    }"
  >
    <canvas ref="CanvasRef" class="absolute top-0 h-full w-full" w="1" h="1" />
  </div>
</template>

<style scoped></style>
