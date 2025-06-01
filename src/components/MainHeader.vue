<script setup lang="ts">
import { Tooltip } from 'floating-vue'
import DarkModeSwitch from './DarkModeSwitch.vue'
import LangSwitcher from './LangSwitcher.vue'
</script>

<template>
  <header>
    <div class="header">
      <div class="logo-wrapper">
        <div class="i-icon-park-twotone-game-ps" />
        <h1>{{ $t('application.name') }}</h1>
      </div>
      <div class="tools-wrapper">
        <LangSwitcher />
        <DarkModeSwitch />
        <Tooltip>
          <a href="https://github.com/sponsors/daidr" target="_blank" class="dou-icon-link" title="GitHub Sponsors" aria-label="GitHub Sponsors">
            <div class="i-mingcute-hand-heart-line" />
          </a>
          <template #popper>
            GitHub Sponsors
          </template>
        </Tooltip>

        <Tooltip>
          <a href="https://github.com/daidr/dualsense-tester" target="_blank" class="dou-icon-link" title="GitHub" aria-label="GitHub">
            <div class="i-mingcute-github-line" />
          </a>
          <template #popper>
            GitHub
          </template>
        </Tooltip>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
header {
  @apply select-none;
  @apply w-full px-2;

  .header {
    @apply max-w-[var(--max-width)] w-full text-lg;
    @apply flex justify-between items-center mx-auto my-3;
    @apply dou-sc-container;
  }

  .logo-wrapper {
    @apply flex items-center gap-2 text-primary font-bold;

    h1 {
      @apply hidden sm:block;
    }
  }

  .tools-wrapper {
    @apply flex items-center gap-4;
  }
}
</style>
