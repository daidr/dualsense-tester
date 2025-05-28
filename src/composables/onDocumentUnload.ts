import { useEventListener } from "@vueuse/core"

export function onDocumentUnload(fn: (e: BeforeUnloadEvent) => any) {
    useEventListener(window, 'beforeunload', (evt) => {
        return fn(evt)
    })
}
