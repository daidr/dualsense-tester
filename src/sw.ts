import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { gitDefine } from '@/utils/env.util'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
  if (!event.data) {
    return
  }
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  else if (event.data.type === 'GET_GIT_VERSION_INFO') {
    event.ports[0].postMessage({
      type: 'GET_GIT_VERSION_INFO_RESP',
      gitDefine,
    })
  }
})

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {}),
)
