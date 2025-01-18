<script setup lang="ts">
import ConnectPanel from './components/ConnectPanel.vue';
import InfoPanel from './components/InfoPanel.vue';
import { useDualSenseStore } from './store/dualsense';
import OutputPanel from './components/OutputPanel.vue';
import DebugPanel from './components/DebugPanel.vue';
const dualsenseStore = useDualSenseStore()

const isDev = import.meta.env.DEV
</script>

<template>
    <div class="flex flex-col lg:grid lg:grid-cols-[400px_1fr] gap-3 flex-grow">
        <div class="flex flex-col gap-3 items-start">
            <ConnectPanel />
            <OutputPanel v-if="dualsenseStore.isConnected" />
            <DebugPanel v-if="isDev" />
        </div>
        <div class="dou-sc-container">
            <InfoPanel />
        </div>
    </div>
</template>

<style scoped>

</style>