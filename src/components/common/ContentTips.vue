<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
}>()
</script>

<template>
  <div class="dou-sc-autoborder rounded-24px p-4 space-y-2">
    <div class="flex items-center gap-1 text-lg text-primary font-bold lh-1em">
      <div :class="icon ?? 'i-icon-park-twotone-grinning-face-with-open-mouth'" />
      <div>{{ title ?? $t('common.tips') }}</div>
    </div>
    <div>
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
