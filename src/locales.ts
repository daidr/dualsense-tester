const LOCALES: Record<string, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English (US)',
  'ru-RU': 'Русский',
  'fa-IR': 'فارسی',
  'ar-EG': 'العربية (مصر)',
  'ar-SA': 'العربية (السعودية)',
  'it-IT': 'Italiano (Italia)',
}

export function getLocaleLabel(locale: string): string {
  return LOCALES[locale] || 'Unknown'
}
