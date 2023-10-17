import './assets/main.scss'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { getPreferredLanguage } from '@/utils/lang.util'
const lang = getPreferredLanguage(navigator.languages || [navigator.language])

export const i18n = createI18n({
  locale: lang,
  fallbackLocale: 'en-US',
  warnHtmlMessage: false,
  messages,
  legacy: false,
  globalInjection: true
})

app.use(i18n)

app.mount('#app')
