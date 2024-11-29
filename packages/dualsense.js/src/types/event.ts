import type { DualSenseState } from '@/gadgets/state'
import type { DualSenseModel } from './model'
import { defineTypedCustomEvent, defineTypedEvent } from 'typed-event-target'

export interface ConnectEventDetail {
  device: HIDDevice
  model: DualSenseModel
}

export class ControllerStateChangeEvent extends defineTypedCustomEvent<DualSenseState>()(
  'state-change',
) { }

export class ControllerConnectEvent extends defineTypedCustomEvent<ConnectEventDetail>()('connected') { }

export class ControllerDisconnectEvent extends defineTypedEvent('disconnected') { }

export type AllSupportControllerEvents =
  | ControllerStateChangeEvent
  | ControllerConnectEvent
  | ControllerDisconnectEvent
