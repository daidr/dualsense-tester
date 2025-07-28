<script setup lang="ts">
import { h, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useModal } from '@/composables/useModal'
import { useUpgradeStore } from '@/store/upgrade'
import { gitDefine } from '@/utils/env.util'
import { track } from '@/utils/umami.util'
import NewVersionDiff from '../NewVersionDiff.vue'

const { t } = useI18n()

const upgradeStore = useUpgradeStore()

let closeFn = () => { }

const { open: openModal } = useModal()

watch(() => upgradeStore.needRefresh, (value) => {
  if (!value) {
    closeFn()
    return
  }
  const { close } = openModal({
    title: t('pwa.title'),
    confirmText: t('pwa.upgrade'),
    cancelText: t('pwa.dismiss'),
    icon: 'i-mingcute-arrow-up-circle-line',
    content: h(NewVersionDiff, {
    }),
    onConfirm: () => {
      upgradeStore.updateServiceWorker(true)
      track('pwa_upgrade_modal', {
        action: 'confirm',
        new_version: upgradeStore.upgradeGitVersion?.shortCommitHash,
      })
    },
    onCancel() {
      track('pwa_upgrade_modal', {
        action: 'cancel',
        new_version: upgradeStore.upgradeGitVersion?.shortCommitHash,
      })
    },
  })
  closeFn = close
}, {
  immediate: true,
})

onUnmounted(() => {
  closeFn()
})

onMounted(() => {
  if ('umami' in window) {
    window?.umami?.track(props => ({
      ...props,
      version: gitDefine.shortCommitHash,
      versionTimestamp: gitDefine.commitTimestamp,
    }))
  }
})
</script>

<template>
  <div />
</template>
