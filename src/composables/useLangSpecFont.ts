import type { MaybeRefOrGetter } from 'vue'
import { toValue, watch } from 'vue'

const defaultFontFamily = `'SN Pro', -apple-system, BlinkMacSystemFont, 'SF Pro Text', PingFang SC, 'Helvetica Neue', 'Helvetica', Hiragino Sans GB, Microsoft YaHei, sans-serif`

export function getLangSpecFont(lang: string) {
  const font = {
    'ar-SA': 'vazirmatn',
    'ar-EG': 'vazirmatn',
    'fa-IR': 'vazirmatn',
  }[lang]
  return `${font ? `${font},` : ''}${defaultFontFamily}`
}

function generateStyle(font: string) {
  return `\
:root {
    --default-fonts: ${font};
}\
`
}

let styleWrapper = document.querySelector('#special-fonts')!
if (!styleWrapper) {
  const style = document.createElement('style')
  style.id = 'special-fonts'
  document.head.appendChild(style)
  styleWrapper = style
}

export function useLangSpecFont(lang: MaybeRefOrGetter<string>) {
  watch(() => toValue(lang), (lang) => {
    const style = generateStyle(getLangSpecFont(lang))

    styleWrapper.textContent = style
  }, {
    immediate: true,
    flush: 'pre',
  })
}
