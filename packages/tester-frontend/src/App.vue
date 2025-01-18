<script setup lang="ts">
import { storeToRefs } from 'pinia';
import MainFooter from './components/MainFooter.vue';
import MainHeader from './components/MainHeader.vue';
import { usePageStore } from './store/page';

import { useOverlayHeader } from './composables/useOverlayHeader';
import OverlayHeader from './components/OverlayHeader.vue';
import AppInner from './AppInner.vue';

const pageStore = usePageStore()
const { isWebHIDSupported } = storeToRefs(pageStore)
const showOverlayHeader = useOverlayHeader()
</script>

<template>
  <OverlayHeader v-if="showOverlayHeader" />
  <MainHeader v-else />

  <main>
    <template v-if="isWebHIDSupported">
      <AppInner />
    </template>
    <template v-else>
      <div class="h-[var(--min-height)] flex flex-col items-center justify-center">
        <div class="i-mingcute-confused-line text-5xl"></div>
        <p class="text-xl">{{ $t("common.not_support_title") }}</p>
        <p class="text-base">{{ $t("common.not_support_content") }}</p>
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
