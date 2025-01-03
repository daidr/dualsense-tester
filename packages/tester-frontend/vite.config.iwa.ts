import type { KeyObject } from 'node:crypto'
import { Buffer } from 'node:buffer'

import { writeFileSync, writeSync } from 'node:fs'
import path, { join, toNamespacedPath } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import webbundle from 'rollup-plugin-webbundle'
import UnoCSS from 'unocss/vite'
import { defineConfig, loadEnv } from 'vite'
import * as wbnSign from 'wbn-sign'
import pkgJSON from './package.json'

const TEMPLATE = {
  name: 'DualSense Tester',
  short_name: 'DualSense Tester',
  display: 'standalone',
  scope: '/',
  start_url: '/',
  version: pkgJSON.version,
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
  permissions_policy: {
    'hid': ['self'],
    'direct-sockets': ['self'],
    'cross-origin-isolated': ['self'],
  },
}

function tidy(str: string) {
  return str.replace(/\s+/g, ' ').trim()
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  let signKey: KeyObject | undefined
  const wbnSignPlugin: ReturnType<typeof webbundle>[] = []

  if (env.VITE_WBN_PRIVATE_KEY) {
    signKey = wbnSign.parsePemKey(
      env.VITE_WBN_PRIVATE_KEY as any,
      env.VITE_WBN_PASSPHRASE,
    )

    writeFileSync('public/.well-known/manifest.webmanifest', JSON.stringify(TEMPLATE))

    wbnSignPlugin.push(
      webbundle({
        baseURL: new wbnSign.WebBundleId(
          signKey,
        ).serializeWithIsolatedWebAppOrigin(),
        static: { dir: 'public' },
        output: 'signed.swbn',
        integrityBlockSign: {
          strategy: new wbnSign.NodeCryptoSigningStrategy(signKey),
        },
        headerOverride: {
          'cross-origin-embedder-policy': 'require-corp',
          'cross-origin-opener-policy': 'same-origin',
          'cross-origin-resource-policy': 'same-origin',
          'content-security-policy':
            tidy(`base-uri \'none\';
             default-src \'self\';
             object-src \'none\';
             frame-src \'self\' https: blob: data:;
             connect-src \'self\' https: wss:;
             script-src \'self\' \'wasm-unsafe-eval\';
             img-src \'self\' https: blob: data:;
             media-src \'self\' https: blob: data:;
             font-src \'self\' blob: data:;
             style-src \'self\' \'unsafe-inline\';
             require-trusted-types-for \'script\';
            `),
        },

      }),
    )
  }

  return ({
    plugins: [
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
      ...wbnSignPlugin,
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist_iwa',
    },
    server: {
      port: 4321,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        clientPort: 4321,
      },
    },
  })
})
