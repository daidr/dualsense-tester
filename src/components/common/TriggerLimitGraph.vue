<script setup lang="ts">
import { useThrottleFn } from '@vueuse/core'
import { Application, Graphics } from 'pixi.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { usePageStore } from '@/store/page'
import { createPixiApplication, usePixiApp } from '@/utils/pixi.util';

const props = defineProps<{
  min: number
  max: number
  current: number
  direction: 'left' | 'right'
}>()

const CanvasRef = useTemplateRef('CanvasRef')

const pageStore = usePageStore()

const initialized = ref(false)

const colorPalette = computed(() => {
  if (pageStore.colorModeState === 'dark') {
    return {
      normal: '#ffffff',
      active: '#2f81f7',
    }
  }
  return {
    normal: '#000000',
    active: '#2f81f7',
  }
})

onMounted(async () => {
  if (!CanvasRef.value) {
    return
  }
  const { isDisposed, app } = await usePixiApp(CanvasRef.value)
  if (isDisposed.value) {
    return
  }

  // Draw 100 radial lines spanning 200 degrees
  const graphics = new Graphics()
  app.stage.addChild(graphics)

  function draw() {
    if (isDisposed.value) {
      return
    }
    let centerX = 0
    const centerY = app.screen.height / 2
    if (props.direction === 'right') {
      centerX = app.screen.width - centerY
    }
    else {
      centerX = centerY
    }
    const outerRadius = centerY * 0.95
    const innerRadius = outerRadius - 7
    const activeInnerRadius = outerRadius - 14
    const startAngle = props.direction === 'right' ? -100 : 80
    const angleRange = 200

    graphics.clear()

    for (let i = 0; i < 100; i++) {
      const index = props.direction === 'right' ? i : 99 - i
      const isActive = index < props.current
      const isDisabled = index < props.min || index >= props.max
      const radius = isActive ? activeInnerRadius : innerRadius
      const angle = (startAngle + (angleRange * i / 99)) * Math.PI / 180

      if (isDisabled) {
        graphics.setStrokeStyle({
          color: colorPalette.value.normal,
          width: 2,
          alpha: 0.3,
          cap: 'round',
          join: 'round',
        })
      }
      else {
        graphics.setStrokeStyle({
          color: isActive ? colorPalette.value.active : colorPalette.value.normal,
          width: 2,
          alpha: 0.7,
          cap: 'round',
          join: 'round',
        })
      }

      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)

      graphics.moveTo(
        centerX + radius * cosAngle,
        centerY + radius * sinAngle,
      )
      graphics.lineTo(
        centerX + outerRadius * cosAngle,
        centerY + outerRadius * sinAngle,
      )
      graphics.stroke()
    }
  }

  const throttledDraw = useThrottleFn(draw, 16, true)

  app.renderer.on('resize', () => {
    throttledDraw()
  })

  watch(
    () => [props.min, props.max, props.current, props.direction, pageStore.colorModeState],
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
  <div class="relative aspect-[3/5] overflow-hidden">
    <canvas ref="CanvasRef" class="absolute top-0 h-full w-full" w="1" h="1" />
  </div>
</template>

<style scoped></style>
