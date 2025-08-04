<script setup lang="ts">
import { ref, watch } from 'vue'
import { utf16LEEncoder } from '@/utils/encoder.util'

const emit = defineEmits<{
  validChanged: [valid: boolean]
}>()
const modelValue = defineModel<string>({ required: true })
const valid = ref(false)

const BYTE_LIMIT = 80

watch(modelValue, (value) => {
  const innerValue = value.trim()
  if (innerValue.length === 0) {
    valid.value = false
    emit('validChanged', valid.value)
    return
  }
  const byte = utf16LEEncoder.encode(innerValue)
  valid.value = byte.length <= BYTE_LIMIT
  emit('validChanged', valid.value)
}, { immediate: true })
</script>

<template>
  <div class="text-base font-normal">
    <input v-model="modelValue" class="w-full dou-sc-colorborder rounded-full bg-transparent px-2 py-1 focus:outline-none focus:ring-2" type="text">
    <div v-if="!valid" class="pt-1 text-xs text-red-600">
      {{ $t('profile_panel.rename_invalid_tips') }}
    </div>
  </div>
</template>

<style scoped></style>
