import messages from '@intlify/unplugin-vue-i18n/messages'
import FloatingVue from 'floating-vue'
import { createPinia } from 'pinia'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { getAvailableLanguages, getPreferredLanguage } from '@/utils/lang.util'

import App from './App.vue'
import './assets/main.scss'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

const app = createApp(App)

// #region Pinia
const pinia = createPinia()
app.use(pinia)
// #endregion

app.use(FloatingVue)

// #region I18n
let lang = localStorage.getItem('lang') || navigator.language
if (!getAvailableLanguages().includes(lang)) {
  lang = getPreferredLanguage(navigator.languages)
  localStorage.setItem('lang', lang)
}

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
