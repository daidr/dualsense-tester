<script setup lang="ts">
import { ref } from 'vue';

const modelValue = defineModel<string>({ required: true })

const ColorInputRef = ref<HTMLInputElement | null>(null)
</script>

<template>
    <div class="dou-sc-colorborder w-2.5em h-1.25em p-2px rounded-10px relative">
        <input ref="ColorInputRef" type="color" v-model="modelValue" class="w-0 h-0 absolute bottom-0" />
        <div @click="ColorInputRef?.click()" class="w-full h-full rounded-8px dou-sc-autoborder" :style="{
            backgroundColor: modelValue
        }"></div>
    </div>
</template>

<style scoped lang="scss"></style>