import { gitDefine } from './env.util'

export function track(name: string, data?: Record<string, any>) {
  if (!('umami' in window)) {
    return
  }
  window?.umami?.track(name, {
    version: gitDefine.shortCommitHash,
    ...data || {},
  })
}
