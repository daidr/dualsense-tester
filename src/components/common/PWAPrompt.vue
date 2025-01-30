<script setup lang="ts">
import { useModal } from '@/composables/useModal'
import { useToast } from '@/composables/useToast'
import { gitDefine } from '@/utils/env.util'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const intervalMS = 60 * 60 * 1000

const { info } = useToast()
const { t } = useI18n()

const {
  needRefresh,
  updateServiceWorker,
} = useRegisterSW({
  onRegisteredSW(swUrl, r) {
    r && setInterval(async () => {
      if (r.installing || !navigator) {
        return
      }

      if (('connection' in navigator) && !navigator.onLine) {
        return
      }

      const resp = await fetch(swUrl, {
        cache: 'no-store',
        headers: {
          'cache': 'no-store',
          'cache-control': 'no-cache',
        },
      })

      if (resp?.status === 200) {
        await r.update()
      }
    }, intervalMS)
  },
  onOfflineReady() {
    info({
      content: t('pwa.offline_ready'),
      duration: 3000,
    })
  },
})

let closeFn = () => { }

watch(() => needRefresh.value, (value) => {
  if (!value) {
    closeFn()
    return
  }
  const { close } = useModal({
    title: t('pwa.title'),
    confirmText: t('pwa.upgrade'),
    cancelText: t('pwa.dismiss'),
    icon: 'i-mingcute-arrow-up-circle-line',
    content: t('pwa.update_available'),
    onConfirm: () => {
      updateServiceWorker(true)
      umami?.track('pwa_upgrade_modal', {
        action: 'confirm',
        version: gitDefine.shortCommitHash,
      })
    },
    onCancel() {
      umami?.track('pwa_upgrade_modal', {
        action: 'cancel',
        version: gitDefine.shortCommitHash,
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
</script>

<template>
  <div />
</template>
