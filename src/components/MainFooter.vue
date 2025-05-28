<script setup lang="ts">
import { Tooltip } from 'floating-vue'
import { useUpgradeStore } from '@/store/upgrade'
import GitVersion from './common/GitVersion.vue'
import NewVersionDiff from './NewVersionDiff.vue'

const upgradeStore = useUpgradeStore()
</script>

<template>
  <footer>
    <div class="footer">
      <div class="left">
        <i18n-t keypath="application.footer.copyright" tag="div" scope="global">
          <template #year>
            <span>{{ new Date().getFullYear() }}</span>
          </template>
          <template #author>
            <a href="http://im.daidr.me" target="_blank" class="dou-sc-link">daidr</a>
          </template>
        </i18n-t>
      </div>
      <div class="right">
        <Tooltip
          v-if="['upgrading', 'waiting'].includes(upgradeStore.upgradeState)" :triggers="['hover', 'focus']" :popper-triggers="['hover', 'focus']" :delay="{
            show: 0,
            hide: 100,
          }"
        >
          <div tabindex="0">
            <div v-if="upgradeStore.upgradeState === 'upgrading'" class="i-mingcute-loading-3-fill animate-spin" />
            <div v-else class="i-mingcute-check-circle-fill" />
          </div>
          <template #popper>
            <NewVersionDiff class="px-0 py-1.5 max-w-250px!" :show-upgrade-button="true" />
          </template>
        </Tooltip>
        <GitVersion />
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
footer {
  @apply select-none;
  @apply w-full px-2;

  .footer {
    @apply max-w-[var(--max-width)] w-full;
    @apply flex justify-between items-center mx-auto my-2;
    @apply dou-sc-container;
  }

  .right {
    @apply flex gap-2 flex-nowrap items-center;
  }
}
</style>
