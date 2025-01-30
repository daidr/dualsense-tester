<script setup lang="ts">
import { useModal } from '@/composables/useModal'
import { defineAsyncComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const {
  shortCommitHash,
  commitTimestamp,
} = __GIT_DEFINE__

const date = new Date(commitTimestamp)

const dateString = date.toLocaleString(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

const modalContent = defineAsyncComponent(() => import('@/components/common/GitVersionModal.vue'))

function handleClick() {
  useModal({
    title: 'Commit',
    icon: 'i-mingcute-git-commit-line',
    cancelText: t('shared.close'),
    hideConfirm: true,
    content: h(modalContent),
  })
}
</script>

<template>
  <span class="commit-span" @click="handleClick">{{ shortCommitHash }}({{ dateString }})</span>
</template>

<style scoped lang="scss">
.commit-span {
  @apply text-xs font-mono text-gray dark-text-gray-5;

  &:hover {
    @apply underline underline-dotted;
  }
}
</style>
