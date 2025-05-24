<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { usePageStore } from '@/store/page'
import { uiLogger } from '@/utils/logger.util'

const pageStore = usePageStore()

function wrappedSwitchMode() {
  tryViewTransition(switchMode)
}

function switchMode() {
  let shouldAnimate = false
  if (pageStore.currentColorMode === 'auto') {
    if (pageStore.systemColorMode !== 'dark') {
      shouldAnimate = true
    }
    pageStore.currentColorMode = 'dark'
  }
  else if (pageStore.currentColorMode === 'dark') {
    pageStore.currentColorMode = 'light'
    shouldAnimate = true
  }
  else {
    if (pageStore.systemColorMode === 'dark') {
      shouldAnimate = true
    }
    pageStore.currentColorMode = 'auto'
  }

  return shouldAnimate
}

const switchRef = ref<HTMLElement | null>(null)

async function tryViewTransition(func: () => boolean) {
  if (!document.startViewTransition) {
    func()
    return
  }

  let shouldAnimate: boolean

  const transition = document.startViewTransition(async () => {
    shouldAnimate = func()
    await nextTick()
  })

  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight
  const radius = Math.sqrt(viewportWidth ** 2 + viewportHeight ** 2)
  const switchBound = switchRef.value?.getBoundingClientRect()
  if (!switchBound)
    return
  const switchCenterX = switchBound.left + switchBound.width / 2
  const switchCenterY = switchBound.top + switchBound.height / 2
  const endCirclePath = `circle(${radius}px at ${switchCenterX}px ${switchCenterY}px)`
  const startCirclePath = `circle(0px at ${switchCenterX}px ${switchCenterY}px)`

  const animate = async () => {
    try {
      await transition.ready
      if (!shouldAnimate)
        return
      document.documentElement.animate(
        { clipPath: [startCirclePath, endCirclePath] },
        { duration: 500, easing: 'ease-out', pseudoElement: '::view-transition-new(root)' },
      )
    }
    catch (e) {
      uiLogger.error(e)
    }
  }

  animate()

  await transition.updateCallbackDone
}
</script>

<template>
  <button ref="switchRef" class="switch" tabindex="0" role="button" aria-label="Switch color mode" @click="wrappedSwitchMode">
    <div class="switch-thumb" :class="[pageStore.currentColorMode]">
      <div v-if="pageStore.currentColorMode === 'light'" class="i-mingcute-sun-line" />
      <div v-if="pageStore.currentColorMode === 'auto'">
        A
      </div>
      <div v-if="pageStore.currentColorMode === 'dark'" class="i-mingcute-moon-line" />
    </div>
  </button>
</template>

<style scoped lang="scss">
.switch {
    @apply relative;
    @apply w-9 h-4;
    @apply rounded-full;
    @apply select-none cursor-pointer;
    @apply transition;
    @apply dou-sc-colorborder;

    &-thumb {
        @apply absolute top-1/2 left-1/2 w-5 h-5;
        @apply transform-gpu -translate-y-1/2 -translate-x-1/2;
        @apply bg-primary rounded-full text-xs color-white font-light;
        @apply transition-transform transform-gpu;
        @apply flex justify-center items-center;

        &.dark {
            @apply -translate-x-full;
        }

        &.light {
            @apply translate-x-0;
        }
    }

    &:hover {
        .switch-thumb {
            @apply scale-130;
        }
    }

    &:active {
        .switch-thumb {
            @apply scale-110;
        }
    }
}
</style>
