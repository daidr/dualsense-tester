import { Application } from 'pixi.js'
import { onBeforeUnmount, ref } from 'vue'

export function createPixiApplication() {
  const app = new Application()
  return app
}

export async function usePixiApp(canvas: HTMLCanvasElement | null) {
  if (!canvas) {
    throw new Error('Canvas reference is required to create a Pixi Application.')
  }

  const isDisposed = ref(false)
  let initedResolver = () => { }
  const inited = new Promise<void>((resolve) => {
    initedResolver = resolve
  })

  const app = createPixiApplication()
  onBeforeUnmount(() => {
    isDisposed.value = true
    inited.then(() => {
      app.destroy({
        removeView: true,
      })
    })
  })
  await app.init({
    preference: 'webgl',
    canvas,
    resizeTo: canvas,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
  })
  initedResolver()
  return {
    app,
    isDisposed,
  }
}
