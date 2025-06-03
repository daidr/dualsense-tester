<script setup lang="ts">
import type { CustomConnectWidgetPanelItem } from '@/device-based-router/shared'
import { m } from 'motion-v';
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  item: CustomConnectWidgetPanelItem
}>()

const { t } = useI18n()

const showWidget = ref(true)

watch(() => props.item, (val) => {
  if (!val.title) {
    showWidget.value = true
  }
  else {
    showWidget.value = !val.fold
  }
}, {
  flush: 'pre',
  immediate: true,
})

const finalTitle = computed(() => {
  if (!props.item.title) {
    return ''
  }
  return typeof props.item.title === 'string' ? props.item.title : t(props.item.title.key)
})
</script>

<template>
  <m.div layout="position" class="rounded-2xl p-1 text-primary space-y-2 dou-sc-colorborder">
    <button v-if="finalTitle" class="widget-toggle" :aria-expanded="showWidget"
      :aria-label="`${finalTitle} widget`" @click="showWidget = !showWidget">
      <div class="line" />
      {{ finalTitle }}
      <div class="line" />
      <div class="i-mingcute-down-fill transform-gpu text-lg transition-transform" :class="{
        'rotate-180': showWidget,
      }" aria-hidden="true" />
    </button>
    <div v-show="showWidget" :exit="{ opacity: 0 }">
      <component :is="item.component" />
    </div>
  </m.div>
</template>

<style scoped lang="scss">
.widget-toggle {
  --color: theme('colors.primary/0.8');

  &:hover {
    --color: theme('colors.primary');
  }

  @apply w-full flex items-center justify-center gap-2 px-1 rounded-xl;
  @apply text-[var(--color)] cursor-pointer text-sm font-bold;
  @apply transition-colors select-none;

  .line {
    @apply content-empty flex-grow;
    @apply h-2px bg-[var(--color)] rounded-full;
    @apply transition-colors;
  }

  @apply bg-transparent hover-bg-primary/10;
}
</style>
