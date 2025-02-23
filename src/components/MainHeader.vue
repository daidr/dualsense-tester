<script setup lang="ts">
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
        <a href="https://github.com/sponsors/daidr" target="_blank" class="dou-icon-link" title="Github Sponsors">
          <div class="i-mingcute-hand-heart-line" />
        </a>
        <a href="https://github.com/daidr/dualsense-tester" target="_blank" class="dou-icon-link" title="GitHub">
          <div class="i-mingcute-github-line" />
        </a>
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

  .dou-icon-link {
    @apply relative;

    &::after {
      content: attr(title);
      @apply absolute left-1/2 -bottom-2 text-xs whitespace-nowrap break-keep;
      @apply transform-gpu -translate-x-1/2 translate-y-full scale-10 opacity-0 transform-origin-tc;
      @apply bg-primary px-2 py-1 rounded-full;
      @apply 'transition-transform,opacity delay-100 duration-200';
    }

    &:hover {
      &::after {
        @apply scale-100 opacity-100;
      }
    }
  }
}
</style>
