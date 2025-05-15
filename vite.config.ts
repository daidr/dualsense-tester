import path from 'node:path'
import process from 'node:process'

import { fileURLToPath, URL } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { crowdinDefine } from './config/crowdin'
import { gitDefine } from './config/git'

const isVercelProduction = process.env.VERCEL_ENV === 'production'

// import vueDevTools from 'vite-plugin-vue-devtools'
// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      // vueDevTools(),
      vueJsx(),
      vue({
        script: {
          defineModel: true,
        },
      }),
      UnoCSS(),
      VueI18nPlugin({
        include: [path.resolve(__dirname, './src/locales/**.json')],
        strictMessage: false,
      }),
      VitePWA({
        strategies: 'injectManifest',
        registerType: 'prompt',
        srcDir: 'src',
        filename: 'sw.ts',
        includeAssets: [
          '/pwa/android-chrome-192x192.png',
          '/pwa/android-chrome-512x512.png',
          '/pwa/apple-touch-icon.png',
          '/pwa/favicon-16x16.png',
          '/pwa/favicon-32x32.png',
          '/pwa/mstile-70x70.png',
          '/pwa/mstile-144x144.png',
          '/pwa/mstile-150x150.png',
          '/pwa/mstile-310x150.png',
          '/pwa/mstile-310x310.png',
          '/pwa/safari-pinned-tab.svg',
          'fonts/*.woff2',
        ],
        manifest: {
          start_url: '/',
          display: 'standalone',
          name: 'DualSense Tester',
          short_name: 'DualSense Tester',
          icons: [
            {
              src: '/pwa/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display_override: ['window-controls-overlay'],
        },
        disable: !isVercelProduction,
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        'vue-router': fileURLToPath(new URL('./src/mock-vue-router.ts', import.meta.url)),
      },
    },
    define: {
      ...await gitDefine(),
      ...await crowdinDefine(env),
    },
  }
})
