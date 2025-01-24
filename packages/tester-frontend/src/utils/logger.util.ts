import { createConsola, LogLevels } from 'consola'

const isDev = import.meta.env.DEV

export const consola = createConsola({
  level: isDev ? LogLevels.verbose : LogLevels.info,
})

export const hidLogger = consola.withTag('HID')
