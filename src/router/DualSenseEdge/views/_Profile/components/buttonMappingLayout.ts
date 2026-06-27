import type { InjectionKey, Ref } from 'vue'
import type { DSEProfileButton } from '../profile'
import { DSEProfileButton as Btn } from '../profile'

// Layout for the controller-model button-mapping page.
//
// Every coordinate lives in one "stage" space (STAGE.w x STAGE.h): the controller
// model (DSEBody) is translated by (modelX, modelY), and the connector polylines
// and capsule positions are pre-computed in the same space. The whole thing
// scales uniformly inside a fixed aspect-ratio container, so capsules, model and
// lines stay aligned without any runtime measurement. Anchor coordinates are the
// model's own viewBox coordinates (1313 x 1037) offset by (modelX, modelY).

export const STAGE = { w: 1773, h: 1177, modelX: 230, modelY: 70 } as const

// Sentinel for the "disabled" choice in a remap picker. -1 is never a valid
// button byte, so it can never collide with a real remap target.
export const DISABLED_VALUE = -1

export type ControlKind = 'remap' | 'toggle' | 'stick' | 'touchpad'

export interface ControlLayout {
  id: string
  /** which physical button this capsule represents (for remap/toggle controls) */
  button?: DSEProfileButton
  kind: ControlKind
  side: 'left' | 'right' | 'top' | 'bottom'
  /** capsule centre, stage coords */
  cap: readonly [number, number]
  /** connector polyline, stage coords (capsule -> rail -> anchor) */
  points: ReadonlyArray<readonly [number, number]>
  /** the polyline's last point (the dot on the controller), stage coords */
  anchor: readonly [number, number]
}

// Per-control kind. CROSS / CIRCLE are remappable but have no disable bit;
// CREATE / OPTIONS / PS can only be enabled/disabled; L3 / R3 open the stick
// popover (stick enable/disable, swap, and the stick-click remap); TOUCHPAD opens
// the touchpad popover (touchpad + touchpad-button enable/disable).
const KIND: Record<string, ControlKind> = {
  UP: 'remap',
  LEFT: 'remap',
  DOWN: 'remap',
  RIGHT: 'remap',
  CIRCLE: 'remap',
  CROSS: 'remap',
  SQUARE: 'remap',
  TRIANGLE: 'remap',
  R1: 'remap',
  R2: 'remap',
  L1: 'remap',
  L2: 'remap',
  PADDLE_LEFT: 'remap',
  PADDLE_RIGHT: 'remap',
  CREATE: 'toggle',
  OPTIONS: 'toggle',
  PS: 'toggle',
  L3: 'stick',
  R3: 'stick',
  TOUCHPAD: 'touchpad',
}

const BUTTON: Record<string, DSEProfileButton | undefined> = {
  UP: Btn.UP,
  LEFT: Btn.LEFT,
  DOWN: Btn.DOWN,
  RIGHT: Btn.RIGHT,
  CIRCLE: Btn.CIRCLE,
  CROSS: Btn.CROSS,
  SQUARE: Btn.SQUARE,
  TRIANGLE: Btn.TRIANGLE,
  R1: Btn.R1,
  R2: Btn.R2,
  R3: Btn.R3,
  L1: Btn.L1,
  L2: Btn.L2,
  L3: Btn.L3,
  PADDLE_LEFT: Btn.PADDLE_LEFT,
  PADDLE_RIGHT: Btn.PADDLE_RIGHT,
  OPTIONS: Btn.Options,
}

const RAW = [
  { id: 'L2', side: 'left', cap: [130, 110], points: [[130, 110], [238, 110], [518, 180]] },
  { id: 'L1', side: 'left', cap: [130, 230], points: [[130, 230], [238, 230], [560, 270]] },
  { id: 'CREATE', side: 'left', cap: [130, 350], points: [[130, 350], [238, 350], [610, 348]] },
  { id: 'UP', side: 'left', cap: [130, 470], points: [[130, 470], [238, 470], [518, 433]] },
  { id: 'LEFT', side: 'left', cap: [130, 590], points: [[130, 590], [238, 590], [461, 489]] },
  { id: 'RIGHT', side: 'left', cap: [130, 710], points: [[130, 710], [238, 710], [575, 489]] },
  { id: 'DOWN', side: 'left', cap: [130, 830], points: [[130, 830], [238, 830], [518, 546]] },
  { id: 'L3', side: 'left', cap: [130, 950], points: [[130, 950], [238, 950], [697, 652]] },
  { id: 'PADDLE_LEFT', side: 'left', cap: [130, 1070], points: [[130, 1070], [238, 1070], [656, 998]] },
  { id: 'R2', side: 'right', cap: [1643, 110], points: [[1643, 110], [1535, 110], [1262, 180]] },
  { id: 'R1', side: 'right', cap: [1643, 230], points: [[1643, 230], [1535, 230], [1220, 270]] },
  { id: 'OPTIONS', side: 'right', cap: [1643, 350], points: [[1643, 350], [1535, 350], [1163, 348]] },
  { id: 'TRIANGLE', side: 'right', cap: [1643, 470], points: [[1643, 470], [1535, 470], [1255, 402]] },
  { id: 'CIRCLE', side: 'right', cap: [1643, 590], points: [[1643, 590], [1535, 590], [1343, 490]] },
  { id: 'SQUARE', side: 'right', cap: [1643, 710], points: [[1643, 710], [1535, 710], [1168, 490]] },
  { id: 'CROSS', side: 'right', cap: [1643, 830], points: [[1643, 830], [1535, 830], [1256, 577]] },
  { id: 'R3', side: 'right', cap: [1643, 950], points: [[1643, 950], [1535, 950], [1075, 652]] },
  { id: 'PADDLE_RIGHT', side: 'right', cap: [1643, 1070], points: [[1643, 1070], [1535, 1070], [1116, 998]] },
  { id: 'TOUCHPAD', side: 'top', cap: [887, 35], points: [[887, 35], [887, 418]] },
  { id: 'PS', side: 'bottom', cap: [885, 1142], points: [[885, 1142], [885, 644]] },
] as const

export const CONTROL_LAYOUT: ControlLayout[] = RAW.map(c => ({
  id: c.id,
  kind: KIND[c.id],
  button: BUTTON[c.id],
  side: c.side,
  cap: c.cap,
  points: c.points,
  // reduce-to-last avoids the arr[arr.length - 1] / arr.at(-1) idioms (the latter
  // needs ES2022, which is above this project's lib target).
  anchor: c.points.reduce((_, point) => point),
}))

// Maps a control id to the matching DSEBody group/path id, so that hovering or
// editing a capsule can co-highlight the real button shape on the model. Controls
// without a dedicated shape in the SVG (the L1/R1 bumpers, the touchpad surface)
// are intentionally omitted — only their connector line lights up.
export const CONTROL_BODY_GROUP: Record<string, string> = {
  UP: 'DPadUp',
  DOWN: 'DPadDown',
  LEFT: 'DPadLeft',
  RIGHT: 'DPadRight',
  CROSS: 'Cross',
  CIRCLE: 'Circle',
  SQUARE: 'Square',
  TRIANGLE: 'Triangle',
  CREATE: 'Create',
  OPTIONS: 'Option',
  PS: 'PS',
  L3: 'LSBorder',
  R3: 'RSBorder',
  L2: 'LT',
  R2: 'RT',
  PADDLE_LEFT: 'LBack',
  PADDLE_RIGHT: 'RBack',
}

// fancy-controller icon for each capsule (by control id), where the icon set has
// a matching glyph. The L3 / R3 capsules represent the whole stick, so they use
// the stick icons (ls / rs) rather than the stick-click ones.
export const CONTROL_ICON: Record<string, string> = {
  UP: 'i-fancy-controller-up-solid',
  DOWN: 'i-fancy-controller-down-solid',
  LEFT: 'i-fancy-controller-left-solid',
  RIGHT: 'i-fancy-controller-right-solid',
  CROSS: 'i-fancy-controller-x-solid',
  CIRCLE: 'i-fancy-controller-circle-solid',
  SQUARE: 'i-fancy-controller-square-solid',
  TRIANGLE: 'i-fancy-controller-triangle-solid',
  L1: 'i-fancy-controller-l1-solid',
  L2: 'i-fancy-controller-l2-solid',
  R1: 'i-fancy-controller-r1-solid',
  R2: 'i-fancy-controller-r2-solid',
  L3: 'i-fancy-controller-ls-solid',
  R3: 'i-fancy-controller-rs-solid',
  CREATE: 'i-fancy-controller-create-solid',
  OPTIONS: 'i-fancy-controller-options-solid',
}

// Text fallback for the capsules that still have no icon (PS, touchpad, paddles).
export const CONTROL_TEXT: Record<string, string> = {
  PS: 'PS',
  PADDLE_LEFT: 'PL',
  PADDLE_RIGHT: 'PR',
  TOUCHPAD: 'TP',
}

// fancy-controller icon per remap *target* button (where one exists). Here L3 / R3
// are the stick-click targets, so they use the l3 / r3 glyphs.
export const BUTTON_ICON: Record<number, string> = {
  [Btn.UP]: 'i-fancy-controller-up-solid',
  [Btn.DOWN]: 'i-fancy-controller-down-solid',
  [Btn.LEFT]: 'i-fancy-controller-left-solid',
  [Btn.RIGHT]: 'i-fancy-controller-right-solid',
  [Btn.CROSS]: 'i-fancy-controller-x-solid',
  [Btn.CIRCLE]: 'i-fancy-controller-circle-solid',
  [Btn.SQUARE]: 'i-fancy-controller-square-solid',
  [Btn.TRIANGLE]: 'i-fancy-controller-triangle-solid',
  [Btn.L1]: 'i-fancy-controller-l1-solid',
  [Btn.L2]: 'i-fancy-controller-l2-solid',
  [Btn.L3]: 'i-fancy-controller-l3-solid',
  [Btn.R1]: 'i-fancy-controller-r1-solid',
  [Btn.R2]: 'i-fancy-controller-r2-solid',
  [Btn.R3]: 'i-fancy-controller-r3-solid',
  [Btn.Options]: 'i-fancy-controller-options-solid',
}

// Short text fallback for target buttons with no icon (only Touchpad now, via its
// uppercase label in DSEProfileButtonLabelMap).
export const BUTTON_TEXT: Record<number, string> = {}

// Shared "which control is currently hovered / being edited" state, provided by
// ButtonMappingModel and written to by each MappingCapsule.
export interface MappingActiveContext {
  activeId: Ref<string | null>
  setActive: (id: string | null) => void
}

export const MAPPING_ACTIVE_KEY: InjectionKey<MappingActiveContext> = Symbol('buttonMappingActive')
