<script setup lang="ts">
import { storeToRefs } from 'pinia';
import MainFooter from './components/MainFooter.vue';
import MainHeader from './components/MainHeader.vue';
import { usePageStore } from './store/page';
import ConnectPanel from './components/ConnectPanel.vue';
import InfoPanel from './components/InfoPanel.vue';
import { useDualSenseStore } from './store/dualsense';
import ContentTips from './components/common/ContentTips.vue';

const dualsenseStore = useDualSenseStore()
const pageStore = usePageStore()
const { isWebHIDSupported } = storeToRefs(pageStore)
</script>

<template>
  <MainHeader />

  <main>
    <template v-if="isWebHIDSupported">
      <div class="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3 min-h-[var(--min-height)]">
        <div class="flex flex-col gap-3 items-start">
          <ConnectPanel />

          <!-- TODO: Output report -->
          <div v-if="dualsenseStore" class="dou-sc-container w-full">
            <ContentTips icon="i-icon-park-twotone-code-laptop" :title="$t('output_panel.in_progress')">
              {{ $t('output_panel.tips') }}
            </ContentTips>
          </div>
        </div>
        <div class="dou-sc-container">
          <InfoPanel />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="h-[var(--min-height)] flex flex-col items-center justify-center">
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
  --min-height: calc(100vh - 5rem - 4rem);
  min-height: var(--min-height);
  @apply w-full max-w-[--max-width] mx-auto px-2;
}
</style>
