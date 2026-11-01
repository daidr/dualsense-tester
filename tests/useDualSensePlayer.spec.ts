import type { EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'
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
  mergers: FakeAudioNode[] = []
  gains: GainNode[] = []
  events: string[] = []

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  close = vi.fn(async () => {})
  resume = vi.fn(async () => {})
  decodeAudioData = vi.fn(async () => ({ duration: 5, numberOfChannels: 2 }) as AudioBuffer)
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
    const merger = new FakeAudioNode()
    this.mergers.push(merger)
    return merger as unknown as ChannelMergerNode
  }

  createChannelSplitter() {
    const splitter = new FakeAudioNode()
    this.splitters.push(splitter)
    return splitter as unknown as ChannelSplitterNode
  }

  createGain() {
    const gain = Object.assign(new FakeAudioNode(), {
      gain: { value: 1 },
    }) as unknown as GainNode
    this.gains.push(gain)
    return gain
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

  it.each([4, 8])('routes haptics only to channels 2 and 3 on a %i-channel-capable sink', async (maxChannelCount) => {
    FakeAudioContext.options.maxChannelCount = maxChannelCount
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)

    expect(await player.setSinkDevice('dualsense-output', 'DualSense Wireless Controller')).toBe(true)
    expect(await player.play()).toBe(true)

    const context = FakeAudioContext.instances[0]
    expect(context.destination.channelCount).toBe(4)
    expect(context.events).toEqual([
      'sink:dualsense-output',
      'sink:dualsense-output',
      'start',
    ])
    expect(context.splitters[0].connect).toHaveBeenCalledWith(expect.anything(), 0, 2)
    expect(context.splitters[0].connect).toHaveBeenCalledWith(expect.anything(), 1, 3)
  })

  it.each(['channelCount', 'channelCountMode', 'channelInterpretation'] as const)(
    'rejects a sink if configuring %s throws, despite advertising four channels',
    async (property) => {
      const player = createPlayer({ audio: false, haptic: true })
      await loadTestClip(player)
      const context = FakeAudioContext.instances[0]
      Object.defineProperty(context.destination, property, {
        configurable: true,
        get: () => property === 'channelCount' ? 2 : 'speakers',
        set: () => { throw new DOMException('Configuration rejected', 'NotSupportedError') },
      })

      expect(await player.setSinkDevice('dualsense-output')).toBe(false)
      expect(player.sinkId.value).toBeNull()
      expect(player.playbackError.value).toBe('quadraphonic-required')
      expect(await player.play()).toBe(false)
      expect(context.sources).toHaveLength(0)
    },
  )

  it('rejects a silently ignored four-channel configuration', async () => {
    const player = createPlayer()
    await loadTestClip(player)
    const context = FakeAudioContext.instances[0]
    Object.defineProperty(context.destination, 'channelCount', {
      configurable: true,
      get: () => 2,
      set: () => {},
    })

    expect(await player.setSinkDevice('dualsense-output')).toBe(false)
    expect(player.playbackError.value).toBe('quadraphonic-required')
  })

  it('reconfigures four discrete channels after setSinkId resets the destination', async () => {
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)
    const context = FakeAudioContext.instances[0]
    context.setSinkId.mockImplementation(async () => {
      context.destination.channelCount = 2
      context.destination.channelInterpretation = 'speakers'
    })

    expect(await player.setSinkDevice('dualsense-output')).toBe(true)
    expect(context.destination).toMatchObject({
      channelCount: 4,
      channelCountMode: 'explicit',
      channelInterpretation: 'discrete',
    })
    expect(await player.play()).toBe(true)
    expect(context.destination.channelCount).toBe(4)
    expect(await player.setSinkDevice('another-dualsense-output')).toBe(true)
    expect(context.destination.channelCount).toBe(4)
    expect(context.destination.channelInterpretation).toBe('discrete')
  })

  it('restores the previous four-channel configuration if a new sink cannot be configured', async () => {
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output', 'DualSense')
    await player.play()
    const context = FakeAudioContext.instances[0]
    context.setSinkId.mockImplementation(async (id) => {
      context.destination.maxChannelCount = id === 'stereo-output' ? 2 : 4
      context.destination.channelCount = 2
      context.destination.channelInterpretation = 'speakers'
    })

    expect(await player.setSinkDevice('stereo-output')).toBe(false)
    expect(player.sinkId.value).toBe('dualsense-output')
    expect(player.sinkLabel.value).toBe('DualSense')
    expect(player.isPlaying.value).toBe(true)
    expect(context.sources[0].stop).not.toHaveBeenCalled()
    expect(context.destination.channelCount).toBe(4)
    expect(context.destination.channelInterpretation).toBe('discrete')
  })

  it('stops before starting a source if four-channel configuration fails at playback time', async () => {
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output')
    const context = FakeAudioContext.instances[0]
    Object.defineProperty(context.destination, 'channelCount', {
      configurable: true,
      get: () => 2,
      set: () => { throw new DOMException('Device changed', 'IndexSizeError') },
    })

    expect(await player.play()).toBe(false)
    expect(player.isPlaying.value).toBe(false)
    expect(player.playbackError.value).toBe('quadraphonic-required')
    expect(context.sources.every(source => source.start.mock.calls.length === 0)).toBe(true)
  })

  it.each(['left', 'right', 'both'] as const)('routes mono input to the %s motor selection', async (channel) => {
    const player = createPlayer({ audio: false, haptic: true })
    await loadTestClip(player)
    const context = FakeAudioContext.instances[0]
    context.decodeAudioData.mockResolvedValue({ duration: 5, numberOfChannels: 1 } as AudioBuffer)
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output')
    player.setHapticChannel(channel)

    expect(await player.play()).toBe(true)
    const routes = context.splitters[0].connect.mock.calls.map(([, output, input]) => [output, input])
    expect(routes).toEqual(channel === 'left' ? [[0, 2]] : channel === 'right' ? [[0, 3]] : [[0, 2], [0, 3]])
  })

  it('duplicates mono audio to both speaker channels', async () => {
    const player = createPlayer()
    await loadTestClip(player)
    const context = FakeAudioContext.instances[0]
    context.decodeAudioData.mockResolvedValue({ duration: 5, numberOfChannels: 1 } as AudioBuffer)
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output')

    expect(await player.play()).toBe(true)
    expect(context.splitters[0].connect.mock.calls.map(([, output, input]) => [output, input])).toEqual([[0, 0], [0, 1]])
  })

  it('rebuilds isolated audio/haptic routes when the switches change during playback', async () => {
    const player = createPlayer({ audio: true, haptic: false })
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output')
    await player.play()
    const context = FakeAudioContext.instances[0]
    const routes = () => context.splitters.at(-1)!.connect.mock.calls.map(([, output, input]) => [output, input])
    expect(routes()).toEqual([[0, 0], [1, 1]])

    player.audioEnabled.value = false
    player.hapticEnabled.value = true
    await nextTick()
    await vi.waitFor(() => expect(context.sources).toHaveLength(2))
    expect(context.sources[0].stop).toHaveBeenCalledOnce()
    expect(context.mergers[0].disconnect).toHaveBeenCalledOnce()
    expect(routes()).toEqual([[0, 2], [1, 3]])

    player.audioEnabled.value = true
    player.hapticEnabled.value = false
    await nextTick()
    await vi.waitFor(() => expect(context.sources).toHaveLength(3))
    expect(context.mergers[1].disconnect).toHaveBeenCalledOnce()
    expect(routes()).toEqual([[0, 0], [1, 1]])
  })

  it('updates haptic gain without restarting the source', async () => {
    const audioEnabled = shallowRef(false)
    const hapticEnabled = shallowRef(true)
    const hapticGain = shallowRef(100)
    const scope = effectScope()
    scopes.push(scope)
    const player = scope.run(() => useDualSensePlayer({ audioEnabled, hapticEnabled, hapticGain }))!
    await loadTestClip(player)
    await player.setSinkDevice('dualsense-output')
    await player.play()
    const context = FakeAudioContext.instances[0]

    hapticGain.value = 0
    await nextTick()
    expect(context.gains[0].gain.value).toBe(0)
    hapticGain.value = 150
    await nextTick()
    expect(context.gains[0].gain.value).toBe(1.5)
    expect(context.sources).toHaveLength(1)
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
