import { createConsola, LogLevels } from 'consola'

const isDev = import.meta.env.DEV

export const consola = createConsola({
  level: isDev ? LogLevels.verbose : LogLevels.info,
})

export const routerLogger = consola.withTag('ROUTER')
export const hidLogger = consola.withTag('HID')
export const uiLogger = consola.withTag('UI')
