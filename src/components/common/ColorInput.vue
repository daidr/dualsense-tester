<script setup lang="ts">
import { ref } from 'vue'

const modelValue = defineModel<string>({ required: true })

const ColorInputRef = ref<HTMLInputElement | null>(null)
</script>

<template>
  <div class="relative h-1.5em w-2.5em dou-sc-colorborder rounded-full p-2px">
    <input ref="ColorInputRef" v-model="modelValue" type="color" class="absolute bottom-0 h-0 w-0">
    <div
      class="h-full w-full dou-sc-autoborder rounded-8px" :style="{
        backgroundColor: modelValue,
      }" @click="ColorInputRef?.click()"
    />
  </div>
</template>

<style scoped lang="scss"></style>
