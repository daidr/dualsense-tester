import messages from '@intlify/unplugin-vue-i18n/messages'

export function getAvailableLanguages(): string[] {
  return Object.keys(messages || {})
}

export function getLangWithoutScript(lang: string): string {
  const langPart = lang.split('-')
  if (langPart.length === 2) {
    return `${langPart[0].toLowerCase()}-${langPart[1].toUpperCase()}`
  }
  else if (langPart.length === 3) {
    return `${langPart[0].toLowerCase()}-${langPart[2].toUpperCase()}`
  }
  return langPart[0].toLowerCase()
}

export function getPreferredLanguage(languages: readonly string[]): string {
  const lang = languages[0]
  const availableLanguages = getAvailableLanguages()
  if (availableLanguages.includes(lang)) {
    return lang
  }

  const langWithoutScript = getLangWithoutScript(lang)
  if (availableLanguages.includes(langWithoutScript)) {
    return langWithoutScript
  }

  const langType = lang.split('-')[0]
  const fallbackLang = availableLanguages.find(lang => lang.startsWith(langType))
  if (fallbackLang) {
    return fallbackLang
  }
  return 'en-US'
}
