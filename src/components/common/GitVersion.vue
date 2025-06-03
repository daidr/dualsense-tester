<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useModal } from '@/composables/useModal'
import { usePageStore } from '@/store/page'

const { t } = useI18n()
const { locale } = storeToRefs(usePageStore())

const {
  shortCommitHash,
  commitTimestamp,
} = __GIT_DEFINE__

const dateString = computed(() => {
  const date = new Date(commitTimestamp)
  return date.toLocaleString(locale.value, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
})

const modalContent = defineAsyncComponent(() => import('@/components/common/GitVersionModal.vue'))

const { open: openModal } = useModal()

function handleClick() {
  openModal({
    title: 'Commit',
    icon: 'i-mingcute-git-commit-line',
    cancelText: t('shared.close'),
    hideConfirm: true,
    content: h(modalContent),
  })
}
</script>

<template>
  <span class="commit-span" @click="handleClick">{{ shortCommitHash }}<span class="hidden sm-inline">({{ dateString
  }})</span></span>
</template>

<style scoped lang="scss">
.commit-span {
  @apply text-xs font-mono text-gray dark-text-gray-5;

  &:hover {
    @apply underline underline-dotted;
  }
}
</style>
