import { getPreferredLanguage } from '@/utils/lang.util'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { createPinia } from 'pinia'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import AppInner from './AppInner.vue'
import './assets/main.scss'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

const app = createApp(App)

// #region Vue Router
const routes = [
  { path: '/', component: AppInner },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

app.use(router)
// #endregion

// #region Pinia
const pinia = createPinia()
app.use(pinia)
// #endregion

// #region I18n
const lang = getPreferredLanguage(navigator.languages || [navigator.language])

export const i18n = createI18n({
  locale: lang,
  fallbackLocale: 'en-US',
  warnHtmlMessage: false,
  messages,
  legacy: false,
  globalInjection: true,
})

app.use(i18n)
// #endregion

app.mount('#app')
