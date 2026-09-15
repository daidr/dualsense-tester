export type DualSenseAudioTarget = 'speaker' | 'headphone'

export const DUALSENSE_AUDIO_VOLUME_MAX: Record<DualSenseAudioTarget, number> = {
  speaker: 0x64,
  headphone: 0x7F,
}

/** Convert the player volume percentage to the controller's HID value. */
export function audioVolumePercentToDeviceValue(target: DualSenseAudioTarget, percent: number): number {
  const normalized = Math.max(0, Math.min(100, percent))
  return Math.round(normalized * DUALSENSE_AUDIO_VOLUME_MAX[target] / 100)
}
