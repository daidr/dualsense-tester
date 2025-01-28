import type { RouterManager } from '.'
import { routerLogger } from '@/utils/logger.util'
import { BaseDeviceRouter } from './shared'

export function registerRouters(routerManager: RouterManager) {
  // 收集所有定义的路由
  const routerDefinitions = import.meta.glob('@/router/*/index.ts', { eager: true, import: 'default' })
  for (const [defPath, defModule] of Object.entries(routerDefinitions)) {
    const RouterClass = defModule as any
    if (RouterClass.prototype instanceof BaseDeviceRouter) {
      routerLogger.debug('Registering router:', defPath)
      routerManager.register(new RouterClass())
    }
    else {
      routerLogger.warn('Skipping non-router module:', defPath)
    }
  }
}
