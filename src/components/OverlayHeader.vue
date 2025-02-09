<script setup lang="ts">
import DarkModeSwitch from './DarkModeSwitch.vue';
import LangSwitcher from './LangSwitcher.vue';


</script>

<template>
    <div class="h-[env(titlebar-area-height)] mb-3">
        <header>
            <div class="header">
                <div class="logo-wrapper">
                    <div class="i-icon-park-twotone-game-ps"></div>
                    <h1>{{ $t('application.name') }}</h1>
                    <DarkModeSwitch class="no-drag" />
                </div>
                <div class="tools-wrapper">
                    <LangSwitcher class="no-drag" />
                </div>
            </div>
        </header>
    </div>
</template>

<style scoped lang="scss">
header {
    @apply select-none;
    @apply w-full;
    @apply h-[env(titlebar-area-height)] fixed top-0 left-0;
    @apply bg-white dark-bg-black z-999;
    app-region: drag;
    -webkit-app-region: drag;

    .header {
        @apply w-[env(titlebar-area-width)] text-lg;
        @apply flex justify-between items-center;
        @apply ps-1 pe-1 mr-[env(titlebar-area-left)] h-full;
    }

    .logo-wrapper {
        @apply flex items-center gap-2 text-primary font-bold;

        h1 {
            @apply hidden;
        }
    }

    .tools-wrapper {
        @apply flex items-center gap-4;
    }

    .no-drag {
        app-region: no-drag;
        -webkit-app-region: no-drag;
    }
}
</style>