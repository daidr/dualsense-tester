<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { storeToRefs } from 'pinia'
import AppInner from './AppInner.vue'
import PWAPrompt from './components/common/PWAPrompt.vue'
import Debug from './components/Debug.vue'
import MainFooter from './components/MainFooter.vue'
import MainHeader from './components/MainHeader.vue'
import OverlayHeader from './components/OverlayHeader.vue'
import { ModalContainer } from './composables/useModal'
import { useOverlayHeader } from './composables/useOverlayHeader'
import { ToastContainer } from './composables/useToast'
import { usePageStore } from './store/page'
import { useEventBusProvider } from './composables/useEventBus'

const pageStore = usePageStore()
const { isWebHIDSupported } = storeToRefs(pageStore)
const showOverlayHeader = useOverlayHeader()
useEventBusProvider()
</script>

<template>
  <OverlayHeader v-if="showOverlayHeader" />
  <MainHeader v-else />
  <ModalContainer />
  <ToastContainer />
  <PWAPrompt />
  <SpeedInsights />
  <Debug />
  <main>
    <template v-if="isWebHIDSupported">
      <AppInner />
    </template>
    <template v-else>
      <div class="h-[var(--min-height)] flex flex-col items-center justify-center">
        <div class="i-mingcute-confused-line text-5xl" />
        <p class="text-xl">
          {{ $t("common.not_support_title") }}
        </p>
        <p class="text-base">
          {{ $t("common.not_support_content") }}
        </p>
      </div>
    </template>
  </main>
  <MainFooter />
</template>

<style scoped>
main {
  @apply w-full max-w-[--max-width] mx-auto px-2;
  @apply flex flex-col flex-grow;
}
</style>
