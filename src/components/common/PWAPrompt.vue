<script setup lang="ts">
import { useModal } from '@/composables/useModal'
import { useUpgradeStore } from '@/store/upgrade'
import { gitDefine } from '@/utils/env.util'
import { h, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NewVersionDiff from '../NewVersionDiff.vue'

const { t } = useI18n()

const upgradeStore = useUpgradeStore()

let closeFn = () => { }

watch(() => upgradeStore.needRefresh, (value) => {
  if (!value) {
    closeFn()
    return
  }
  const { close } = useModal({
    title: t('pwa.title'),
    confirmText: t('pwa.upgrade'),
    cancelText: t('pwa.dismiss'),
    icon: 'i-mingcute-arrow-up-circle-line',
    content: h(NewVersionDiff, {
    }),
    onConfirm: () => {
      upgradeStore.updateServiceWorker(true)
      umami?.track('pwa_upgrade_modal', {
        action: 'confirm',
        version: gitDefine.shortCommitHash,
        new_version: upgradeStore.upgradeGitVersion?.shortCommitHash,
      })
    },
    onCancel() {
      umami?.track('pwa_upgrade_modal', {
        action: 'cancel',
        version: gitDefine.shortCommitHash,
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
  umami?.track(props => ({
    ...props,
    version: gitDefine.shortCommitHash,
    versionTimestamp: gitDefine.commitTimestamp,
  }))
})
</script>

<template>
  <div />
</template>
