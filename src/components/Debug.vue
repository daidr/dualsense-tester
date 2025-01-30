<script setup lang="ts">
import { useModal } from '@/composables/useModal'
import { useToast } from '@/composables/useToast'

declare const window: any

window.useModal = useModal
window.useToast = useToast
</script>

<template>
  <div />
</template>

<style scoped>

</style>
