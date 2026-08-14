import type { MaybeRefOrGetter } from 'vue'
import type { DeviceItem } from '@/device-based-router/shared'
import { computed, onScopeDispose, ref, shallowRef, toValue } from 'vue'
import { useMicrophoneMediaSession } from '@/composables/useMicrophoneMediaSession'
import { DeviceConnectionType } from '@/device-based-router/shared'
import {
  BT_MIC_CONTROL_REPORT_ID,
  BT_MIC_INPUT_REPORT_ID,
  buildBtMicControlReport,
  buildBtMicStateReport,
  getBtMicControlState,
  getBtMicOpusPayload,
} from '@/utils/dualsense/microphoneProtocol'
import { uiLogger } from '@/utils/logger.util'

const MIC_SAMPLE_RATE = 48000
const BT_MIC_FRAME_DURATION_US = 10000
const USB_MIC_CHANNEL_COUNT = 2
const USB_MIC_SIGNAL_CHANNEL = 1

export type DualSenseMicrophoneError
  = | 'permission-denied'
    | 'input-device-required'
    | 'input-unavailable'
    | 'bluetooth-codec-unsupported'
    | 'bluetooth-stream-failed'
    | 'recording-unsupported'
    | 'recording-failed'
    | 'playback-failed'

export interface UseDualSenseMicrophoneOptions {
  device: MaybeRefOrGetter<DeviceItem | undefined>
}

function looksLikeDualSense(label: string): boolean {
  const normalized = label.toLowerCase()
  return normalized.includes('dualsense') || normalized.includes('wireless controller')
}

export function useDualSenseMicrophone(options: UseDualSenseMicrophoneOptions) {
  const inputDevices = shallowRef<MediaDeviceInfo[]>([])
  const selectedInputId = ref<string | null>(null)
  const isCapturing = ref(false)
  const isStarting = ref(false)
  const isMuted = ref(false)
  const error = ref<DualSenseMicrophoneError | null>(null)

  const selectedInputLabel = computed(() =>
    inputDevices.value.find(device => device.deviceId === selectedInputId.value)?.label ?? '',
  )

  let usbStream: MediaStream | null = null
  let usbSource: MediaStreamAudioSourceNode | null = null
  let usbChannelSplitter: ChannelSplitterNode | null = null
  let usbTrackEndedHandler: (() => void) | null = null
  let activeDevice: DeviceItem | null = null

  let btDecoder: AudioDecoder | null = null
  let btInputHandler: ((event: HIDInputReportEvent) => void) | null = null
  let btStateSequence = 0
  let btControlSequence = 0
  let btTimestamp = 0
  let btMuteButtonDown = false
  let btHeadsetMicPlugged = false
  let btReportChain: Promise<unknown> = Promise.resolve()
  let stopPromise: Promise<void> | null = null
  let captureAttempt = 0
  let disposed = false

  function setError(value: DualSenseMicrophoneError, cause?: unknown) {
    error.value = value
    if (cause) {
      uiLogger.error(`DualSense microphone: ${value}`, cause)
    }
  }

  const media = useMicrophoneMediaSession({
    beforePlayback: async () => {
      if (isCapturing.value) {
        await stopCapture()
      }
    },
    onError: setError,
  })

  const {
    analyser,
    hasRecording,
    isPlaying,
    isRecording,
    playbackTime,
    recordingDuration,
  } = media

  function autoPickDualSenseInput() {
    if (selectedInputId.value) {
      return
    }
    const match = inputDevices.value.find(device => looksLikeDualSense(device.label))
    if (match) {
      selectedInputId.value = match.deviceId
    }
  }

  async function refreshInputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      inputDevices.value = []
      return
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      inputDevices.value = devices.filter(device =>
        device.kind === 'audioinput'
        && device.deviceId !== 'default'
        && device.deviceId !== 'communications',
      )

      if (
        selectedInputId.value
        && !inputDevices.value.some(device => device.deviceId === selectedInputId.value)
      ) {
        selectedInputId.value = null
      }
      autoPickDualSenseInput()
    }
    catch (cause) {
      uiLogger.warn('enumerate microphone inputs failed', cause)
    }
  }

  function hasNamedInputs(): boolean {
    return inputDevices.value.some(device => Boolean(device.label))
  }

  async function requestDeviceAccess(): Promise<boolean> {
    error.value = null
    let temporaryStream: MediaStream | null = null
    try {
      temporaryStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      return true
    }
    catch (cause) {
      setError('permission-denied', cause)
      return false
    }
    finally {
      temporaryStream?.getTracks().forEach(track => track.stop())
      await refreshInputDevices()
    }
  }

  // Serialize report writes so a stop racing an in-flight open always leaves
  // the controller with a final close report.
  function queueBtReport(operation: () => Promise<void>): Promise<void> {
    const queued = btReportChain.then(operation)
    btReportChain = queued.catch(() => {})
    return queued
  }

  function nextBtStateReport(active: boolean) {
    return buildBtMicStateReport(btStateSequence++, active, {
      muted: isMuted.value,
      headsetMicPlugged: btHeadsetMicPlugged,
    })
  }

  function nextBtControlReport(active: boolean) {
    return buildBtMicControlReport(btControlSequence++, active)
  }

  function sendBtMicEnabled(device: HIDDevice, active: boolean): Promise<void> {
    return queueBtReport(async () => {
      await device.sendReport(BT_MIC_INPUT_REPORT_ID, nextBtStateReport(active))
      await device.sendReport(BT_MIC_CONTROL_REPORT_ID, nextBtControlReport(active))
    })
  }

  function updateBtMicState(device: HIDDevice, reopenStream: boolean): Promise<void> {
    return queueBtReport(async () => {
      await device.sendReport(BT_MIC_INPUT_REPORT_ID, nextBtStateReport(true))
      if (reopenStream) {
        await device.sendReport(BT_MIC_CONTROL_REPORT_ID, nextBtControlReport(false))
        await device.sendReport(BT_MIC_CONTROL_REPORT_ID, nextBtControlReport(true))
      }
    })
  }

  function handleBtControlReport(device: HIDDevice, event: HIDInputReportEvent) {
    const state = getBtMicControlState(event.reportId, event.data)
    if (!state) {
      return
    }

    let stateChanged = false
    if (state.muteButtonDown && !btMuteButtonDown) {
      isMuted.value = !isMuted.value
      stateChanged = true
    }
    btMuteButtonDown = state.muteButtonDown

    const headsetChanged = state.headsetMicPlugged !== btHeadsetMicPlugged
    if (headsetChanged) {
      btHeadsetMicPlugged = state.headsetMicPlugged
      stateChanged = true
    }

    if (stateChanged) {
      void updateBtMicState(device, headsetChanged).catch((cause) => {
        setError('bluetooth-stream-failed', cause)
        void stopCapture()
      })
    }
  }

  function resetBtInputState() {
    isMuted.value = false
    btMuteButtonDown = false
    btHeadsetMicPlugged = false
  }

  async function startBluetoothCapture(item: DeviceItem) {
    if (typeof AudioDecoder === 'undefined') {
      throw new DOMException('WebCodecs AudioDecoder is unavailable', 'NotSupportedError')
    }

    const config: AudioDecoderConfig = {
      codec: 'opus',
      sampleRate: MIC_SAMPLE_RATE,
      numberOfChannels: 1,
    }
    const support = await AudioDecoder.isConfigSupported(config)
    if (!support.supported) {
      throw new DOMException('Raw Opus decoding is unavailable', 'NotSupportedError')
    }

    btTimestamp = 0
    media.resetCaptureSchedule()
    resetBtInputState()
    btDecoder = new AudioDecoder({
      output: media.scheduleAudioData,
      error: (cause) => {
        setError('bluetooth-stream-failed', cause)
        void stopCapture()
      },
    })
    btDecoder.configure(config)

    btInputHandler = (event: HIDInputReportEvent) => {
      const payload = getBtMicOpusPayload(event.reportId, event.data)
      if (!payload) {
        handleBtControlReport(item.device, event)
        return
      }
      if (!btDecoder || btDecoder.state !== 'configured') {
        return
      }
      btDecoder.decode(new EncodedAudioChunk({
        type: 'key',
        timestamp: btTimestamp,
        duration: BT_MIC_FRAME_DURATION_US,
        data: payload,
      }))
      btTimestamp += BT_MIC_FRAME_DURATION_US
    }
    item.device.addEventListener('inputreport', btInputHandler)
    await sendBtMicEnabled(item.device, true)
  }

  async function startUsbCapture(attempt: number) {
    await refreshInputDevices()
    if (!selectedInputId.value && !await requestDeviceAccess()) {
      return false
    }
    autoPickDualSenseInput()
    if (!selectedInputId.value) {
      setError('input-device-required')
      return false
    }

    usbStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: selectedInputId.value },
        sampleRate: { ideal: MIC_SAMPLE_RATE },
        channelCount: { ideal: 2 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    if (disposed || attempt !== captureAttempt) {
      usbStream.getTracks().forEach(track => track.stop())
      usbStream = null
      return false
    }
    const audioTrack = usbStream.getAudioTracks()[0]
    if (audioTrack) {
      usbTrackEndedHandler = () => {
        if (isCapturing.value) {
          setError('input-unavailable')
          void stopCapture()
        }
      }
      audioTrack.addEventListener('ended', usbTrackEndedHandler, { once: true })
    }
    const context = media.ensureAudioGraph()
    usbSource = context.createMediaStreamSource(usbStream)
    const channelCount = audioTrack?.getSettings().channelCount ?? USB_MIC_CHANNEL_COUNT
    if (channelCount > USB_MIC_SIGNAL_CHANNEL) {
      // DualSense USB audio is stereo-shaped, with mono microphone PCM in channel 1.
      usbChannelSplitter = context.createChannelSplitter(channelCount)
      usbSource.connect(usbChannelSplitter)
      media.connectCaptureSource(usbChannelSplitter, USB_MIC_SIGNAL_CHANNEL)
    }
    else {
      media.connectCaptureSource(usbSource)
    }
    return true
  }

  async function startCapture(): Promise<boolean> {
    if (isCapturing.value) {
      return true
    }
    if (stopPromise) {
      await stopPromise
    }
    if (isStarting.value) {
      return false
    }

    const attempt = ++captureAttempt
    isStarting.value = true
    error.value = null
    media.pausePlayback()
    try {
      const item = toValue(options.device)
      if (!item) {
        setError('input-unavailable')
        return false
      }

      const context = media.ensureAudioGraph()
      await context.resume()
      if (disposed || attempt !== captureAttempt) {
        return false
      }
      activeDevice = item

      if (item.connectionType === DeviceConnectionType.Bluetooth) {
        await startBluetoothCapture(item)
      }
      else if (item.connectionType === DeviceConnectionType.USB) {
        if (!await startUsbCapture(attempt)) {
          activeDevice = null
          return false
        }
      }
      else {
        setError('input-unavailable')
        activeDevice = null
        return false
      }

      if (disposed || attempt !== captureAttempt) {
        await cleanupCaptureTransport(true)
        return false
      }
      isCapturing.value = true
      media.setCaptureActive(true)
      return true
    }
    catch (cause) {
      if (disposed || attempt !== captureAttempt) {
        await cleanupCaptureTransport(true)
        return false
      }
      const isCodecError = cause instanceof DOMException && cause.name === 'NotSupportedError'
      const isPermissionError = cause instanceof DOMException
        && (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')
      setError(
        isCodecError
          ? 'bluetooth-codec-unsupported'
          : isPermissionError
            ? 'permission-denied'
            : activeDevice?.connectionType === DeviceConnectionType.Bluetooth
              ? 'bluetooth-stream-failed'
              : 'input-unavailable',
        cause,
      )
      await cleanupCaptureTransport(true)
      return false
    }
    finally {
      isStarting.value = false
    }
  }

  async function stopBluetoothTransport(suppressErrors: boolean) {
    const device = activeDevice?.device
    if (device && btInputHandler) {
      device.removeEventListener('inputreport', btInputHandler)
    }
    btInputHandler = null

    if (device?.opened) {
      try {
        await sendBtMicEnabled(device, false)
      }
      catch (cause) {
        if (!suppressErrors) {
          setError('bluetooth-stream-failed', cause)
        }
        else {
          uiLogger.warn('close Bluetooth microphone stream failed', cause)
        }
      }
    }

    if (btDecoder && btDecoder.state === 'configured') {
      try {
        await btDecoder.flush()
      }
      catch (cause) {
        uiLogger.warn('flush Bluetooth microphone decoder failed', cause)
      }
    }
    if (btDecoder && btDecoder.state !== 'closed') {
      btDecoder.close()
    }
    btDecoder = null

    await media.finishScheduledCapture(isRecording.value)
  }

  function stopUsbTransport() {
    usbChannelSplitter?.disconnect()
    usbChannelSplitter = null
    usbSource?.disconnect()
    usbSource = null
    const audioTrack = usbStream?.getAudioTracks()[0]
    if (audioTrack && usbTrackEndedHandler) {
      audioTrack.removeEventListener('ended', usbTrackEndedHandler)
    }
    usbTrackEndedHandler = null
    usbStream?.getTracks().forEach(track => track.stop())
    usbStream = null
  }

  async function cleanupCaptureTransport(suppressErrors: boolean) {
    const connectionType = activeDevice?.connectionType
    if (connectionType === DeviceConnectionType.Bluetooth || btDecoder || btInputHandler) {
      await stopBluetoothTransport(suppressErrors)
    }
    stopUsbTransport()
    activeDevice = null
  }

  async function stopCapture(suppressErrors = false): Promise<void> {
    captureAttempt++
    if (stopPromise) {
      return stopPromise
    }
    if (!isCapturing.value && !activeDevice) {
      return
    }

    stopPromise = (async () => {
      isCapturing.value = false
      media.setCaptureActive(false)

      const wasBluetooth = activeDevice?.connectionType === DeviceConnectionType.Bluetooth
      if (wasBluetooth) {
        await cleanupCaptureTransport(suppressErrors)
        if (isRecording.value) {
          await media.stopRecording()
        }
      }
      else {
        if (isRecording.value) {
          await media.stopRecording()
        }
        await cleanupCaptureTransport(suppressErrors)
      }
    })().finally(() => {
      stopPromise = null
    })
    return stopPromise
  }

  function startRecording(): boolean {
    error.value = null
    return media.startRecording()
  }

  function stopRecording(): Promise<void> {
    return media.stopRecording()
  }

  async function playRecording(): Promise<boolean> {
    error.value = null
    return media.playRecording()
  }

  function pausePlayback() {
    media.pausePlayback()
  }

  function clearRecording() {
    media.clearRecording()
  }

  async function dispose() {
    if (disposed) {
      return
    }
    disposed = true
    navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
    await stopCapture(true)
    await media.dispose()
  }

  function onDeviceChange() {
    void refreshInputDevices()
  }

  navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
  onScopeDispose(() => {
    void dispose()
  })

  return {
    inputDevices,
    selectedInputId,
    selectedInputLabel,
    isCapturing,
    isStarting,
    isRecording,
    isPlaying,
    isMuted,
    hasRecording,
    recordingDuration,
    playbackTime,
    error,
    analyser,
    refreshInputDevices,
    hasNamedInputs,
    requestDeviceAccess,
    startCapture,
    stopCapture,
    startRecording,
    stopRecording,
    playRecording,
    pausePlayback,
    clearRecording,
    dispose,
  }
}

export type DualSenseMicrophone = ReturnType<typeof useDualSenseMicrophone>
