import { defineConfig, presetIcons, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  details: true,
  presets: [
    presetWind3({
      dark: 'class',
    }),
    presetIcons({
      collections: {
        mingcute: () => import('@iconify-json/mingcute/icons.json').then(i => i.default),
        'icon-park-twotone': () => import('@iconify-json/icon-park-twotone/icons.json').then(i => i.default),
        'fancy-controller': () => import('fancy-controller/icons.json').then(i => i.default),
      }
    }),
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
  theme: {
    colors: {
      primary: {
        light: '#e8effb',
        DEFAULT: '#2f81f7',
        dark: '#071f40',
      },
    },
    fontFamily: {
      mono: ['Noto Sans Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
    },
    containers: {
      sm: '(min-width: 24rem)',
    },
  },
  shortcuts: {
    'dou-sc-capsule':
      'px-2 lh-1.1em flex-shrink-0 text-primary/80 dou-sc-colorborder rounded-full whitespace-nowrap',
    'dou-sc-btn':
      'transition bg-transparent dou-sc-colorborder text-primary px-4 py-1 rounded-full transform-gpu flex items-center gap-1 hover:(bg-primary text-white) active:(scale-90) disabled:(filter-grayscale bg-transparent! scale-100! text-primary! cursor-not-allowed)',
    'dou-sc-container': 'dou-sc-autoborder rounded-32px px-3 py-3',
    'dou-sc-autoborder': 'border-1 border-gray-3 dark-border-gray-6',
    'dou-sc-colorborder': 'border-1.5 border-primary/20 dark-border-primary/50',
    'dou-sc-autobg': 'bg-primary/20 dark-bg-primary/50',
    'dou-sc-title': 'text-xl font-bold text-primary lh-1em',
    'dou-sc-subtitle': 'text-xl font-bold text-primary lh-1.2em my-2',
    'dou-sc-link': 'text-primary hover:underline',
  },
})
