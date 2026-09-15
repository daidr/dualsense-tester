import { describe, expect, it } from 'vitest'
import { audioVolumePercentToDeviceValue, DUALSENSE_AUDIO_VOLUME_MAX } from './audioVolume'

describe('DualSense audio volume', () => {
  it('maps player percentages to the speaker range', () => {
    expect(audioVolumePercentToDeviceValue('speaker', 0)).toBe(0)
    expect(audioVolumePercentToDeviceValue('speaker', 50)).toBe(50)
    expect(audioVolumePercentToDeviceValue('speaker', 100)).toBe(0x64)
  })

  it('maps player percentages to the headphone range', () => {
    expect(audioVolumePercentToDeviceValue('headphone', 0)).toBe(0)
    expect(audioVolumePercentToDeviceValue('headphone', 50)).toBe(64)
    expect(audioVolumePercentToDeviceValue('headphone', 100)).toBe(0x7F)
  })

  it('clamps values outside the percentage range', () => {
    expect(audioVolumePercentToDeviceValue('speaker', -1)).toBe(0)
    expect(audioVolumePercentToDeviceValue('speaker', 255)).toBe(DUALSENSE_AUDIO_VOLUME_MAX.speaker)
  })
})
