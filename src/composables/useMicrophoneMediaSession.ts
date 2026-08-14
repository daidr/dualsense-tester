import { ref, shallowRef } from 'vue'

const MIC_SAMPLE_RATE = 48000

export type MicrophoneMediaError
  = | 'recording-unsupported'
    | 'recording-failed'
    | 'playback-failed'

export interface UseMicrophoneMediaSessionOptions {
  beforePlayback?: () => Promise<void>
  onError: (error: MicrophoneMediaError, cause?: unknown) => void
}

interface PendingCaptureSource {
  node: AudioBufferSourceNode
  ended: Promise<void>
}

function preferredRecorderMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
  ]
  return candidates.find(type => MediaRecorder.isTypeSupported(type))
}

export function useMicrophoneMediaSession(options: UseMicrophoneMediaSessionOptions) {
  const isRecording = ref(false)
  const isPlaying = ref(false)
  const hasRecording = ref(false)
  const recordingDuration = ref(0)
  const playbackTime = ref(0)
  const analyser = shallowRef<AnalyserNode | null>(null)

  let captureActive = false
  let audioContext: AudioContext | null = null
  let captureAnalyser: AnalyserNode | null = null
  let playbackAnalyser: AnalyserNode | null = null
  let recordingDestination: MediaStreamAudioDestinationNode | null = null
  let captureScheduleTime = 0
  const pendingCaptureSources = new Set<PendingCaptureSource>()

  let recorder: MediaRecorder | null = null
  let recorderChunks: Blob[] = []
  let recordingStartedAt = 0
  let recordingTimer = 0
  let recordingStopResolver: (() => void) | null = null
  let recordingStopPromise: Promise<void> | null = null

  let recordingUrl: string | null = null
  let playbackElement: HTMLAudioElement | null = null
  let playbackSource: MediaElementAudioSourceNode | null = null

  function updateActiveAnalyser() {
    if (isPlaying.value) {
      analyser.value = playbackAnalyser
    }
    else if (captureActive) {
      analyser.value = captureAnalyser
    }
    else {
      analyser.value = null
    }
  }

  function ensureAudioGraph(): AudioContext {
    if (audioContext) {
      return audioContext
    }

    audioContext = new AudioContext({ sampleRate: MIC_SAMPLE_RATE })
    captureAnalyser = audioContext.createAnalyser()
    captureAnalyser.fftSize = 512
    captureAnalyser.smoothingTimeConstant = 0.8
    playbackAnalyser = audioContext.createAnalyser()
    playbackAnalyser.fftSize = 512
    playbackAnalyser.smoothingTimeConstant = 0.8
    recordingDestination = audioContext.createMediaStreamDestination()

    // Live capture is routed only to the recorder destination, never speakers.
    captureAnalyser.connect(recordingDestination)
    playbackAnalyser.connect(audioContext.destination)
    return audioContext
  }

  function setCaptureActive(active: boolean) {
    captureActive = active
    updateActiveAnalyser()
  }

  function connectCaptureSource(source: AudioNode, output = 0) {
    ensureAudioGraph()
    source.connect(captureAnalyser!, output)
  }

  function resetCaptureSchedule() {
    captureScheduleTime = audioContext?.currentTime ?? 0
  }

  function scheduleAudioData(audioData: AudioData) {
    try {
      if (!audioContext || !captureAnalyser) {
        return
      }

      const samples = new Float32Array(audioData.numberOfFrames)
      audioData.copyTo(samples, { planeIndex: 0, format: 'f32-planar' })
      const buffer = audioContext.createBuffer(1, audioData.numberOfFrames, audioData.sampleRate)
      buffer.copyToChannel(samples, 0)

      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(captureAnalyser)
      captureScheduleTime = Math.max(captureScheduleTime, audioContext.currentTime)

      let resolveEnded!: () => void
      const pending: PendingCaptureSource = {
        node: source,
        ended: new Promise<void>((resolve) => {
          resolveEnded = resolve
        }),
      }
      pendingCaptureSources.add(pending)
      source.onended = () => {
        source.disconnect()
        pendingCaptureSources.delete(pending)
        resolveEnded()
      }
      source.start(captureScheduleTime)
      captureScheduleTime += audioData.numberOfFrames / audioData.sampleRate
    }
    finally {
      audioData.close()
    }
  }

  async function finishScheduledCapture(preserveTail: boolean) {
    if (preserveTail) {
      await Promise.allSettled(Array.from(pendingCaptureSources, source => source.ended))
    }
    else {
      for (const source of pendingCaptureSources) {
        try {
          source.node.stop()
        }
        catch {
          // The node may have ended between Set iteration and stop().
        }
        source.node.disconnect()
      }
    }
    pendingCaptureSources.clear()
  }

  function destroyPlaybackElement() {
    playbackElement?.pause()
    if (playbackElement) {
      playbackElement.removeAttribute('src')
      playbackElement.load()
    }
    playbackSource?.disconnect()
    playbackSource = null
    playbackElement = null
    isPlaying.value = false
    playbackTime.value = 0
    updateActiveAnalyser()
  }

  function revokeRecordingUrl() {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
      recordingUrl = null
    }
  }

  function clearRecording() {
    destroyPlaybackElement()
    revokeRecordingUrl()
    hasRecording.value = false
    recordingDuration.value = 0
  }

  function finishRecording() {
    if (recordingTimer) {
      window.clearInterval(recordingTimer)
      recordingTimer = 0
    }
    isRecording.value = false
    recordingDuration.value = Math.max(0, (performance.now() - recordingStartedAt) / 1000)

    const chunks = recorderChunks
    recorderChunks = []
    const mimeType = recorder?.mimeType || chunks[0]?.type || 'audio/webm'
    recorder = null
    if (chunks.length === 0 || chunks.every(chunk => chunk.size === 0)) {
      options.onError('recording-failed')
    }
    else {
      revokeRecordingUrl()
      recordingUrl = URL.createObjectURL(new Blob(chunks, { type: mimeType }))
      hasRecording.value = true
      playbackTime.value = 0
    }
    recordingStopResolver?.()
    recordingStopResolver = null
    recordingStopPromise = null
  }

  function startRecording(): boolean {
    if (!captureActive || !recordingDestination) {
      return false
    }
    if (typeof MediaRecorder === 'undefined') {
      options.onError('recording-unsupported')
      return false
    }

    try {
      clearRecording()
      recorderChunks = []
      const mimeType = preferredRecorderMimeType()
      recorder = new MediaRecorder(
        recordingDestination.stream,
        mimeType ? { mimeType } : undefined,
      )
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunks.push(event.data)
        }
      }
      recorder.onerror = (event) => {
        options.onError('recording-failed', event.error)
      }
      recorder.onstop = finishRecording
      recordingStartedAt = performance.now()
      recordingDuration.value = 0
      isRecording.value = true
      recordingTimer = window.setInterval(() => {
        recordingDuration.value = (performance.now() - recordingStartedAt) / 1000
      }, 100)
      recorder.start()
      return true
    }
    catch (cause) {
      recorder = null
      options.onError('recording-failed', cause)
      return false
    }
  }

  function stopRecording(): Promise<void> {
    if (recordingStopPromise) {
      return recordingStopPromise
    }
    if (!recorder || recorder.state === 'inactive') {
      return Promise.resolve()
    }
    const pending = new Promise<void>((resolve) => {
      recordingStopResolver = resolve
    })
    recordingStopPromise = pending
    recorder.stop()
    return pending
  }

  function ensurePlaybackElement(): HTMLAudioElement | null {
    if (!recordingUrl) {
      return null
    }
    if (playbackElement) {
      return playbackElement
    }

    const context = ensureAudioGraph()
    playbackElement = new Audio(recordingUrl)
    playbackElement.preload = 'metadata'
    playbackElement.ontimeupdate = () => {
      playbackTime.value = playbackElement?.currentTime ?? 0
    }
    playbackElement.ondurationchange = () => {
      const duration = playbackElement?.duration
      if (duration && Number.isFinite(duration)) {
        recordingDuration.value = duration
      }
    }
    playbackElement.onended = () => {
      isPlaying.value = false
      playbackTime.value = recordingDuration.value
      updateActiveAnalyser()
    }
    playbackSource = context.createMediaElementSource(playbackElement)
    playbackSource.connect(playbackAnalyser!)
    return playbackElement
  }

  async function playRecording(): Promise<boolean> {
    if (!hasRecording.value || isRecording.value) {
      return false
    }
    try {
      await options.beforePlayback?.()
      const context = ensureAudioGraph()
      await context.resume()
      const element = ensurePlaybackElement()
      if (!element) {
        return false
      }
      if (element.ended) {
        element.currentTime = 0
      }
      await element.play()
      isPlaying.value = true
      updateActiveAnalyser()
      return true
    }
    catch (cause) {
      options.onError('playback-failed', cause)
      return false
    }
  }

  function pausePlayback() {
    playbackElement?.pause()
    isPlaying.value = false
    updateActiveAnalyser()
  }

  async function dispose() {
    if (isRecording.value) {
      await stopRecording()
    }
    destroyPlaybackElement()
    revokeRecordingUrl()
    await finishScheduledCapture(false)
    captureAnalyser?.disconnect()
    playbackAnalyser?.disconnect()
    await audioContext?.close()
    audioContext = null
    captureAnalyser = null
    playbackAnalyser = null
    recordingDestination = null
    analyser.value = null
  }

  return {
    isRecording,
    isPlaying,
    hasRecording,
    recordingDuration,
    playbackTime,
    analyser,
    ensureAudioGraph,
    setCaptureActive,
    connectCaptureSource,
    resetCaptureSchedule,
    scheduleAudioData,
    finishScheduledCapture,
    startRecording,
    stopRecording,
    playRecording,
    pausePlayback,
    clearRecording,
    dispose,
  }
}
