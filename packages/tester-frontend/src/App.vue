<script setup lang="ts">
import { storeToRefs } from 'pinia';
import MainFooter from './components/MainFooter.vue';
import MainHeader from './components/MainHeader.vue';
import { usePageStore } from './store/page';

const pageStore = usePageStore()
const { isWebHIDSupported } = storeToRefs(pageStore)

</script>

<template>
  <MainHeader />

  <main>
    <template v-if="isWebHIDSupported">
      supported
    </template>
    <template v-else>
      <div class="h-[var(--max-height)] flex flex-col items-center justify-center">
        <div class="i-mingcute-confused-line text-5xl"></div>
        <p class="text-xl">Your browser does not support WebHID</p>
        <p class="text-base">Try to use the latest version of Google Chrome or Microsoft Edge</p>
      </div>
    </template>
  </main>

  <MainFooter />
</template>

<style scoped>
main {
  --max-height: calc(100vh - 5rem - 4rem);
  min-height: var(--max-height);
  @apply w-full max-w-[--max-width] mx-auto px-2;
}
</style>
