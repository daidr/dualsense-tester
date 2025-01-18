import { ref } from 'vue'

export function useOverlayHeader() {
  const showOverlayHeader = ref(false)
  if ('windowControlsOverlay' in navigator) {
    showOverlayHeader.value = (navigator.windowControlsOverlay as any).visible;
    (navigator.windowControlsOverlay as any).addEventListener(
      'geometrychange',
      (event: any) => {
        showOverlayHeader.value = event.visible
      },
    )
  }
  return showOverlayHeader
}
