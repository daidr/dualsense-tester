import { getPreferredLanguage } from '@/utils/lang.util'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { createPinia } from 'pinia'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

import './assets/main.scss'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
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

app.mount('#app')
