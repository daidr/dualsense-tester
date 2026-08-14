import type { EffectScope } from 'vue'
import type { DeviceItem } from '@/device-based-router/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef } from 'vue'
import { useDualSenseMicrophone } from '@/composables/useDualSenseMicrophone'
import { DeviceConnectionType } from '@/device-based-router/shared'

vi.mock('@/utils/logger.util', () => ({
  uiLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

class FakeAudioNode {
  connect = vi.fn()
  disconnect = vi.fn()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []

  currentTime = 0
  destination = {}
  captureSource = new FakeAudioNode()
  channelSplitter = new FakeAudioNode()
  mediaStream = { id: 'recording-stream' }

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  resume = vi.fn(async () => {})
  close = vi.fn(async () => {})

  createAnalyser() {
    return Object.assign(new FakeAudioNode(), {
      fftSize: 0,
      smoothingTimeConstant: 0,
    }) as unknown as AnalyserNode
  }

  createMediaStreamDestination() {
    return Object.assign(new FakeAudioNode(), {
      stream: this.mediaStream,
    }) as unknown as MediaStreamAudioDestinationNode
  }

  createMediaStreamSource() {
    return this.captureSource as unknown as MediaStreamAudioSourceNode
  }

  createChannelSplitter = vi.fn(() =>
    this.channelSplitter as unknown as ChannelSplitterNode,
  )

  createMediaElementSource() {
    return new FakeAudioNode() as unknown as MediaElementAudioSourceNode
  }
}

class FakeEncodedAudioChunk {
  type: EncodedAudioChunkType
  timestamp: number
  duration: number | null
  data: Uint8Array

  constructor(init: EncodedAudioChunkInit) {
    this.type = init.type
    this.timestamp = init.timestamp
    this.duration = init.duration ?? null
    this.data = new Uint8Array(init.data as ArrayBuffer)
  }
}

class FakeAudioDecoder {
  static instances: FakeAudioDecoder[] = []
  static isConfigSupported = vi.fn(async (config: AudioDecoderConfig) => ({ supported: true, config }))

  state: CodecState = 'unconfigured'
  chunks: FakeEncodedAudioChunk[] = []

  constructor(_init: AudioDecoderInit) {
    FakeAudioDecoder.instances.push(this)
  }

  configure = vi.fn(() => {
    this.state = 'configured'
  })

  decode = vi.fn((chunk: FakeEncodedAudioChunk) => {
    this.chunks.push(chunk)
  })

  flush = vi.fn(async () => {})

  close = vi.fn(() => {
    this.state = 'closed'
  })
}

class FakeAudioElement {
  static instances: FakeAudioElement[] = []

  preload = ''
  currentTime = 0
  duration = 1
  ended = false
  ontimeupdate: (() => void) | null = null
  ondurationchange: (() => void) | null = null
  onended: (() => void) | null = null
  play = vi.fn(async () => {})
  pause = vi.fn()
  removeAttribute = vi.fn()
  load = vi.fn()

  constructor(public src = '') {
    FakeAudioElement.instances.push(this)
  }
}

class FakeMediaRecorder {
  static isTypeSupported = vi.fn(() => true)
  static instances: FakeMediaRecorder[] = []

  state: RecordingState = 'inactive'
  mimeType: string
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onerror: ((event: MediaRecorderErrorEvent) => void) | null = null
  onstop: (() => void) | null = null

  constructor(public stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? 'audio/webm'
    FakeMediaRecorder.instances.push(this)
  }

  start = vi.fn(() => {
    this.state = 'recording'
  })

  stop = vi.fn(() => {
    this.state = 'inactive'
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(['recorded'], { type: this.mimeType }) } as BlobEvent)
      this.onstop?.()
    })
  })
}

interface FakeHidDevice {
  opened: boolean
  sendReport: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  emitInput: (reportId: number, data: Uint8Array) => void
}

function createHidDevice(): FakeHidDevice {
  let inputHandler: ((event: HIDInputReportEvent) => void) | null = null
  return {
    opened: true,
    sendReport: vi.fn(async () => {}),
    addEventListener: vi.fn((type: string, handler: (event: HIDInputReportEvent) => void) => {
      if (type === 'inputreport') {
        inputHandler = handler
      }
    }),
    removeEventListener: vi.fn((type: string, handler: (event: HIDInputReportEvent) => void) => {
      if (type === 'inputreport' && inputHandler === handler) {
        inputHandler = null
      }
    }),
    emitInput: (reportId, bytes) => inputHandler?.({
      reportId,
      data: new DataView(bytes.buffer),
    } as HIDInputReportEvent),
  }
}

const scopes: EffectScope[] = []

function createMicrophone(connectionType: DeviceConnectionType, hid = createHidDevice()) {
  const device = shallowRef<DeviceItem>({
    deviceName: 'DualSense Wireless Controller',
    connectionType,
    device: hid as unknown as HIDDevice,
  })
  const scope = effectScope()
  scopes.push(scope)
  let microphone!: ReturnType<typeof useDualSenseMicrophone>
  scope.run(() => {
    microphone = useDualSenseMicrophone({ device })
  })
  return { microphone, hid }
}

beforeEach(() => {
  FakeAudioContext.instances = []
  FakeAudioDecoder.instances = []
  FakeMediaRecorder.instances = []
  FakeAudioElement.instances = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('AudioDecoder', FakeAudioDecoder)
  vi.stubGlobal('EncodedAudioChunk', FakeEncodedAudioChunk)
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('Audio', FakeAudioElement)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:microphone-recording')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  while (scopes.length) {
    scopes.pop()!.stop()
  }
})

describe('useDualSenseMicrophone Bluetooth transport', () => {
  it('opens the HID microphone stream, decodes audio reports, and closes it symmetrically', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        enumerateDevices: vi.fn(async () => []),
      },
    })
    const { microphone, hid } = createMicrophone(DeviceConnectionType.Bluetooth)

    expect(await microphone.startCapture()).toBe(true)
    expect(hid.sendReport.mock.calls.map(call => call[0])).toEqual([0x31, 0x32])

    const input = new Uint8Array(77)
    input[0] = 0x02
    for (let index = 0; index < 71; index++) {
      input[index + 2] = index
    }
    hid.emitInput(0x31, input)

    expect(FakeAudioDecoder.instances[0].chunks).toHaveLength(1)
    expect(Array.from(FakeAudioDecoder.instances[0].chunks[0]!.data))
      .toEqual(Array.from({ length: 71 }, (_, index) => index))

    const mutePress = new Uint8Array(77)
    mutePress[0] = 0x01
    mutePress[10] = 0x04
    hid.emitInput(0x31, mutePress)
    await vi.waitFor(() => expect(hid.sendReport).toHaveBeenCalledTimes(3))

    expect(microphone.isMuted.value).toBe(true)
    expect(hid.sendReport.mock.calls[2]![0]).toBe(0x31)
    const muteState = hid.sendReport.mock.calls[2]![1] as Uint8Array
    expect(muteState[8]).toBe(0)
    expect(muteState[10]).toBe(1)

    const headsetPlugged = new Uint8Array(77)
    headsetPlugged[0] = 0x01
    headsetPlugged[54] = 0x02
    hid.emitInput(0x31, headsetPlugged)
    await vi.waitFor(() => expect(hid.sendReport).toHaveBeenCalledTimes(6))
    expect(hid.sendReport.mock.calls.slice(3).map(call => call[0])).toEqual([0x31, 0x32, 0x32])
    const headsetState = hid.sendReport.mock.calls[3]![1] as Uint8Array
    expect(headsetState[9]).toBe(0x08)

    await microphone.stopCapture()

    expect(hid.removeEventListener).toHaveBeenCalledWith('inputreport', expect.any(Function))
    expect(hid.sendReport.mock.calls.map(call => call[0])).toEqual([
      0x31,
      0x32,
      0x31,
      0x31,
      0x32,
      0x32,
      0x31,
      0x32,
    ])
    expect(FakeAudioDecoder.instances[0].flush).toHaveBeenCalledOnce()
    expect(FakeAudioDecoder.instances[0].close).toHaveBeenCalledOnce()
  })
})

describe('useDualSenseMicrophone USB transport and recording', () => {
  it('releases a USB stream that resolves after the panel has been disposed', async () => {
    const stopTrack = vi.fn()
    let resolveStream!: (stream: unknown) => void
    const getUserMedia = vi.fn(() => new Promise(resolve => resolveStream = resolve))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        enumerateDevices: vi.fn(async () => [
          { kind: 'audioinput', deviceId: 'dualsense-mic', label: 'DualSense Wireless Controller' },
        ]),
        getUserMedia,
      },
    })
    const { microphone } = createMicrophone(DeviceConnectionType.USB)

    const starting = microphone.startCapture()
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce())
    const disposing = microphone.dispose()
    resolveStream({
      getAudioTracks: () => [],
      getTracks: () => [{ stop: stopTrack }],
    })

    expect(await starting).toBe(false)
    await disposing
    expect(stopTrack).toHaveBeenCalledOnce()
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce()
  })

  it('selects the DualSense input, releases capture tracks, and records a playable clip', async () => {
    const stopTrack = vi.fn()
    const audioTrack = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getSettings: vi.fn(() => ({ channelCount: 2 })),
      stop: stopTrack,
    }
    const getUserMedia = vi.fn(async () => ({
      getAudioTracks: () => [audioTrack],
      getTracks: () => [audioTrack],
    }))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        enumerateDevices: vi.fn(async () => [
          { kind: 'audioinput', deviceId: 'dualsense-mic', label: 'Microphone (DualSense Wireless Controller)' },
        ]),
        getUserMedia,
      },
    })
    const { microphone } = createMicrophone(DeviceConnectionType.USB)

    expect(await microphone.startCapture()).toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        deviceId: { exact: 'dualsense-mic' },
        sampleRate: { ideal: 48000 },
        echoCancellation: false,
      }),
    })
    const context = FakeAudioContext.instances[0]!
    expect(context.createChannelSplitter).toHaveBeenCalledWith(2)
    expect(context.captureSource.connect).toHaveBeenCalledWith(context.channelSplitter)
    expect(context.channelSplitter.connect).toHaveBeenCalledWith(expect.anything(), 1)
    expect(microphone.startRecording()).toBe(true)
    await microphone.stopRecording()

    expect(microphone.hasRecording.value).toBe(true)
    expect(await microphone.playRecording()).toBe(true)
    expect(stopTrack).toHaveBeenCalledOnce()
    expect(FakeAudioElement.instances[0].src).toBe('blob:microphone-recording')
    expect(FakeAudioElement.instances[0].play).toHaveBeenCalledOnce()
    expect(context.channelSplitter.disconnect).toHaveBeenCalledOnce()
  })

  it('keeps a native mono USB stream on the direct capture path', async () => {
    const audioTrack = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getSettings: vi.fn(() => ({ channelCount: 1 })),
      stop: vi.fn(),
    }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        enumerateDevices: vi.fn(async () => [
          { kind: 'audioinput', deviceId: 'dualsense-mic', label: 'DualSense Wireless Controller' },
        ]),
        getUserMedia: vi.fn(async () => ({
          getAudioTracks: () => [audioTrack],
          getTracks: () => [audioTrack],
        })),
      },
    })
    const { microphone } = createMicrophone(DeviceConnectionType.USB)

    expect(await microphone.startCapture()).toBe(true)

    const context = FakeAudioContext.instances[0]!
    expect(context.createChannelSplitter).not.toHaveBeenCalled()
    expect(context.captureSource.connect).toHaveBeenCalledWith(expect.anything(), 0)

    await microphone.stopCapture()
  })

  it('stops the temporary permission stream before refreshing named inputs', async () => {
    const stopTrack = vi.fn()
    const enumerateDevices = vi.fn()
      .mockResolvedValueOnce([{ kind: 'audioinput', deviceId: 'default', label: '' }])
      .mockResolvedValueOnce([
        { kind: 'audioinput', deviceId: 'dualsense-mic', label: 'DualSense Wireless Controller' },
      ])
    const getUserMedia = vi.fn(async () => ({
      getAudioTracks: () => [],
      getTracks: () => [{ stop: stopTrack }],
    }))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        enumerateDevices,
        getUserMedia,
      },
    })
    const { microphone } = createMicrophone(DeviceConnectionType.USB)

    await microphone.refreshInputDevices()
    expect(await microphone.requestDeviceAccess()).toBe(true)

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(stopTrack).toHaveBeenCalledOnce()
    expect(microphone.selectedInputId.value).toBe('dualsense-mic')
  })
})
