<script setup lang="ts">
import DarkModeSwitch from './DarkModeSwitch.vue';


</script>

<template>
    <header>
        <div class="header">
            <div class="logo-wrapper">
                <div class="i-icon-park-twotone-game-ps"></div>
                <h1>DualSense Tester</h1>
            </div>
            <div class="tools-wrapper">
                <DarkModeSwitch />
                <a href="https://github.com/daidr/dualsense-tester" target="_blank" class="dou-icon-link">
                    <div class="i-mingcute-github-line"></div>
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
        @apply flex justify-between items-center mx-auto my-2;
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