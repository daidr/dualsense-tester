import { defineConfig } from 'unocss'
import presetUno from 'unocss/preset-uno'
import { presetIcons } from 'unocss'
import transformerVariantGroup from '@unocss/transformer-variant-group'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  presets: [
    presetUno({
      dark: 'class'
    }),
    presetIcons({})
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
  theme: {
    colors: {
      primary: {
        light: '#e8effb',
        DEFAULT: '#2f81f7',
        dark: '#071f40'
      }
    }
  },
  shortcuts: {
    'dou-sc-capsule':
      'px-2 lh-1.1em flex-shrink-0 max-w-1/3 text-primary/80 border-1.5 border-primary/30 rounded-full whitespace-nowrap',
    'dou-sc-btn':
      'transition bg-transparent border-primary/20 border-1.5 text-primary px-4 py-1 rounded-md transform-gpu flex items-center gap-1 hover:(bg-primary text-white) active:(scale-90)',
    'dou-sc-container': 'border-1 border-gray-3 dark-border-gray-6 rounded-full px-4 py-3',
    'dou-sc-link': 'text-primary hover:underline'
  }
})
