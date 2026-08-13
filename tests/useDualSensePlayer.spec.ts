import type { EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef } from 'vue'
import { useDualSensePlayer } from '@/composables/useDualSensePlayer'

vi.mock('@/utils/logger.util', () => ({
  uiLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

interface FakeAudioOptions {
  maxChannelCount: number
  rejectSink: boolean
}

class FakeAudioNode {
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeBufferSourceNode extends FakeAudioNode {
  buffer: AudioBuffer | null = null
  onended: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static options: FakeAudioOptions = { maxChannelCount: 4, rejectSink: false }

  currentTime = 0
  destination = {
    maxChannelCount: FakeAudioContext.options.maxChannelCount,
    channelCount: 2,
    channelCountMode: 'max',
    channelInterpretation: 'speakers',
  }

  sources: FakeBufferSourceNode[] = []
  splitters: FakeAudioNode[] = []
  events: string[] = []

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  close = vi.fn(async () => {})
  resume = vi.fn(async () => {})
  decodeAudioData = vi.fn(async () => ({ duration: 5 }) as AudioBuffer)
  setSinkId = vi.fn(async (deviceId: string) => {
    this.events.push(`sink:${deviceId}`)
    if (FakeAudioContext.options.rejectSink) {
      throw new DOMException('Sink rejected', 'NotAllowedError')
    }
  })

  createAnalyser() {
    return Object.assign(new FakeAudioNode(), {
      fftSize: 0,
      smoothingTimeConstant: 0,
    }) as unknown as AnalyserNode
  }

  createBufferSource() {
    const source = new FakeBufferSourceNode()
    source.start.mockImplementation(() => this.events.push('start'))
    this.sources.push(source)
    return source as unknown as AudioBufferSourceNode
  }

  createChannelMerger() {
    return new FakeAudioNode() as unknown as ChannelMergerNode
  }

  createChannelSplitter() {
    const splitter = new FakeAudioNode()
    this.splitters.push(splitter)
    return splitter as unknown as ChannelSplitterNode
  }

  createGain() {
    return Object.assign(new FakeAudioNode(), {
      gain: { value: 1 },
    }) as unknown as GainNode
  }
}

const scopes: EffectScope[] = []

function createPlayer(options: { audio?: boolean, haptic?: boolean } = {}) {
  const audioEnabled = shallowRef(options.audio ?? true)
  const hapticEnabled = shallowRef(options.haptic ?? false)
  const hapticGain = shallowRef(100)
  const scope = effectScope()
  scopes.push(scope)

  let player!: ReturnType<typeof useDualSensePlayer>
  scope.run(() => {
    player = useDualSensePlayer({ audioEnabled, hapticEnabled, hapticGain })
  })
  return player
}

async function loadTestClip(player: ReturnType<typeof useDualSensePlayer>) {
  await player.loadFile({
    name: 'test.wav',
    arrayBuffer: async () => new ArrayBuffer(8),
  } as File)
}

beforeEach(() => {
  FakeAudioContext.instances = []
  FakeAudioContext.options = { maxChannelCount: 4, rejectSink: false }
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      enumerateDevices: vi.fn(async () => []),
      getUserMedia: vi.fn(),
    },
  })
})

afterEach(() => {
  while (scopes.length) {
    scopes.pop()!.stop()
  }
})

describe('useDualSensePlayer USB output routing', () => {
  it('does not start playback before an output device is explicitly confirmed', async () => {
    const player = createPlayer()
    await loadTestClip(player)

    const played = await player.play()

    expect(played).toBe(false)
    expect(FakeAudioContext.instances[0].sources).toHaveLength(0)
    expect(player.playbackError.value).toBe('output-device-required')
  })

  it('does not retain a device when setSinkId rejects it', async () => {
    FakeAudioContext.options.rejectSink = true
    const player = createPlayer()
    await loadTestClip(player)

    const selected = await player.setSinkDevice('dualsense-output', 'DualSense Wireless Controller')

    expect(selected).toBe(false)
    expect(player.sinkId.value).toBeNull()
    expect(player.playbackError.value).toBe('output-routing-failed')
  })

  it('clears an already-selected sink when it can no longer be confirmed', async () => {
    const player = createPlayer()
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output', 'DualSense Wireless Controller')
    await player.play()
    FakeAudioContext.options.rejectSink = true

    expect(await player.setSinkDevice('dualsense-output', 'DualSense Wireless Controller')).toBe(false)

    expect(player.sinkId.value).toBeNull()
    expect(player.isPlaying.value).toBe(false)
    expect(player.playbackError.value).toBe('output-routing-failed')
  })

  it('rejects haptics on a stereo sink instead of routing them to channels 0 and 1', async () => {
    FakeAudioContext.options.maxChannelCount = 2
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)

    const selected = await player.setSinkDevice('stereo-output', 'PC Speakers')

    expect(selected).toBe(false)
    expect(FakeAudioContext.instances[0].sources).toHaveLength(0)
    expect(player.playbackError.value).toBe('quadraphonic-required')

    expect(await player.play()).toBe(false)
    expect(FakeAudioContext.instances[0].sources).toHaveLength(0)
  })

  it('rejects a stereo sink at selection time even before haptics are enabled', async () => {
    FakeAudioContext.options.maxChannelCount = 2
    const player = createPlayer({ audio: true, haptic: false })

    const selected = await player.setSinkDevice('stereo-output', 'PC Speakers')

    expect(selected).toBe(false)
    expect(player.sinkId.value).toBeNull()
    expect(player.playbackError.value).toBe('quadraphonic-required')
  })

  it('routes haptics only to channels 2 and 3 after confirming a quadraphonic sink', async () => {
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)

    expect(await player.setSinkDevice('dualsense-output', 'DualSense Wireless Controller')).toBe(true)
    expect(await player.play()).toBe(true)

    const context = FakeAudioContext.instances[0]
    expect(context.events).toEqual([
      'sink:dualsense-output',
      'sink:dualsense-output',
      'start',
    ])
    expect(context.splitters[0].connect).toHaveBeenCalledWith(expect.anything(), 0, 2)
    expect(context.splitters[0].connect).toHaveBeenCalledWith(expect.anything(), 1, 3)
  })

  it('stops playback and clears a selected sink when that device disappears', async () => {
    const listeners = new Map<string, EventListener>()
    const enumerateDevices = vi.fn()
      .mockResolvedValueOnce([
        { kind: 'audiooutput', deviceId: 'dualsense-output', label: 'DualSense Wireless Controller' },
      ])
      .mockResolvedValueOnce([])
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices,
        addEventListener: vi.fn((event: string, listener: EventListener) => listeners.set(event, listener)),
        removeEventListener: vi.fn(),
      },
    })
    const player = createPlayer()
    await loadTestClip(player)
    await player.refreshOutputDevices()
    await player.setSinkDevice('dualsense-output', 'DualSense Wireless Controller')
    await player.play()

    listeners.get('devicechange')!(new Event('devicechange'))
    await vi.waitFor(() => expect(player.sinkId.value).toBeNull())

    expect(player.isPlaying.value).toBe(false)
    expect(player.playbackError.value).toBe('output-device-required')
  })
})

describe('useDualSensePlayer output-device permission fallback', () => {
  it('stops the temporary microphone track and refreshes detailed outputs', async () => {
    const stop = vi.fn()
    const enumerateDevices = vi.fn()
      .mockResolvedValueOnce([
        { kind: 'audiooutput', deviceId: 'default', label: '' },
      ])
      .mockResolvedValueOnce([
        { kind: 'audiooutput', deviceId: 'default', label: 'System default' },
        { kind: 'audiooutput', deviceId: 'dualsense-output', label: 'DualSense Wireless Controller' },
      ])
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices, getUserMedia },
    })
    const player = createPlayer()

    await player.refreshOutputDevices()
    const granted = await player.requestDeviceAccess()

    expect(granted).toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(stop).toHaveBeenCalledOnce()
    expect(player.outputDevices.value.map(device => device.deviceId)).toEqual(['default', 'dualsense-output'])
  })
})
