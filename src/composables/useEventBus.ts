import { inject, onScopeDispose, provide, reactive, ref, type Ref } from 'vue'

const __EVENT_BUS_PROVIDE__ = Symbol('__EVENT_BUS_PROVIDE__')

type EventMap = Map<string | number | symbol, Set<any>>

export function useEventBusProvider() {
    const events: EventMap = new Map()

    provide(__EVENT_BUS_PROVIDE__, events)
}

/**
 * Use case:
 * const [useEventBusRegister, eventBusEmit] = useEventBus({
 *  'event-name': [param1: string, param2: number]
 * })
 *
 * useEventBusRegister('event-name', (param1, param2) => {
 * console.log(param1, param2)
 * })
 *
 *
 * eventBusEmit('event-name', 'param1', 2)
 */

export function useEventBus<EventDefs extends Record<string | number | symbol, any[]>>() {
    const useEventBusRegister = <EventName extends keyof EventDefs>(eventName: EventName, callback: (...args: EventDefs[EventName]) => void) => {
        const eventBus = inject<EventMap>(__EVENT_BUS_PROVIDE__)!
        console.log('eventBus', eventBus)
        if (!eventBus.has(eventName)) {
            eventBus.set(eventName, new Set())
        }
        eventBus.get(eventName)?.add(callback)

        onScopeDispose(() => {
            eventBus.get(eventName)?.delete(callback)
        })
    }

    const useEventBusEmit = () => {
        const eventBus = inject<EventMap>(__EVENT_BUS_PROVIDE__)!
        return <EventName extends keyof EventDefs>(eventName: EventName, ...args: EventDefs[EventName]) => {
            console.log('eventBus', eventBus)
            eventBus.get(eventName)?.forEach((callback) => {
                callback(...args)
            })
        }
    }

    return [useEventBusRegister, useEventBusEmit] as const
}
