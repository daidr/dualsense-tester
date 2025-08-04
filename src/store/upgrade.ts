import { acceptHMRUpdate, defineStore } from 'pinia'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { usePageStore } from '@/store/page'

const intervalMS = 30 * 60 * 1000
function getUpgradeState(state: ServiceWorkerState): 'upgrading' | 'waiting' | 'idle' {
  switch (state) {
    case 'installing':
      return 'upgrading'
    case 'installed':
      return 'waiting'
    default:
      return 'idle'
  }
}

export const useUpgradeStore = defineStore('upgrade', () => {
  const { info } = useToast()
  const { t } = useI18n()

  const upgradeState = ref<'upgrading' | 'waiting' | 'idle'>('idle')

  const upgradeGitVersion = ref<GitInfo | undefined>(undefined)

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

      let checkNewSWCleanUp = () => { }

      r?.addEventListener('updatefound', () => {
        checkNewSW()
      })

      checkNewSW()

      function checkNewSW() {
        checkNewSWCleanUp()
        const newSW = r?.installing || r?.waiting
        if (!newSW) {
          return
        }
        upgradeState.value = getUpgradeState(newSW.state)
        const stateChangeListener = () => {
          upgradeState.value = getUpgradeState(newSW.state)
        }
        newSW.addEventListener('statechange', stateChangeListener)
        const messageListener = (event: any) => {
          if (!event.data) {
            return
          }
          if (event.data.type === 'GET_GIT_VERSION_INFO_RESP') {
            upgradeGitVersion.value = event.data.gitDefine
          }
        }
        const channel = new MessageChannel()
        channel.port1.addEventListener('message', messageListener)
        channel.port1.start()
        newSW.postMessage({
          type: 'GET_GIT_VERSION_INFO',
        }, [channel.port2])
        checkNewSWCleanUp = () => {
          newSW.removeEventListener('statechange', stateChangeListener)
          channel.port1.removeEventListener('message', messageListener)
          channel.port1.close()
        }
      }
    },
    onOfflineReady() {
      info({
        content: t('pwa.offline_ready'),
        duration: 3000,
      })
    },
  })

  // if (import.meta.env.DEV) {
  //   upgradeState.value = 'waiting'
  //   upgradeGitVersion.value = gitDefine
  //   needRefresh.value = true
  // }

  return {
    upgradeState,
    upgradeGitVersion,
    needRefresh,
    updateServiceWorker,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePageStore, import.meta.hot))
}
