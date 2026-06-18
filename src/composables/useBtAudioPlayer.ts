import type { Ref } from 'vue'
import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import { useDevice } from '@/composables/useInjectValues'
import {
  buildReportSix,
  encodeOpusFrames,
  encodeSilentOpusFrame,
  extractHapticFrames,
  HAPTIC_FRAME_BYTES,
  OPUS_FRAME_BYTES,
  resampleStereo,
} from '@/utils/dualsense/btAudioStream'
import { hidLogger } from '@/utils/logger.util'

// 每帧真实时长：音频重采样到 45k 后 480 样本/帧 = 480/45000 ≈ 10.667ms。
const FRAME_DURATION_S = 480 / 45000
const HAPTIC_GAIN = 1 // 触觉信号增益，音乐当触觉偏弱时可调大

/**
 * 蓝牙文件播放器内核。接口与 useDualSensePlayer 兼容，供 MediaFilePlayer 复用。
 *
 * 蓝牙不经 Web Audio 输出：用一个本地静音 AudioBufferSource 作「时钟 + 频谱」，
 * 并按其播放时间同步把预编码的 0x36 报告通过 HID 发给手柄。
 * 0x36 同时承载音频(Opus)子包与触觉(PCM)子包：audioEnabled 决定音频子包是音乐还是静音，
 * hapticEnabled 决定触觉子包是信号还是全 0——切换开关即时生效、无需重新加载。
 * 「同步在电脑播放」时把本地源的增益开到 1，即可同时在电脑听到。
 */
export function useBtAudioPlayer(options: { audioEnabled: Ref<boolean>, hapticEnabled: Ref<boolean>, audioTarget: Ref<string>, audioVolume: Ref<number> }) {
  const { audioEnabled, hapticEnabled, audioTarget, audioVolume } = options

  const device = useDevice()

  const fileName = ref('')
  const hasClip = ref(false)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const syncToPC = ref(false)
  const analyser = shallowRef<AnalyserNode | null>(null)

  // 与 useDualSensePlayer 接口对齐，但蓝牙无关 —— 做空实现。
  const outputDevices = shallowRef<MediaDeviceInfo[]>([])
  const sinkId = ref('')
  const sinkLabel = ref('')
  const outputPickerSupported = ref(false)
  const hapticChannel = ref<'left' | 'right' | 'both'>('both')

  let buffer48k: AudioBuffer | null = null
  // 预编码好的各路数据，按开关实时选取（避免切开关时重新编码）。
  let musicOpus: Uint8Array[] = [] // 音乐 Opus 帧
  let silentOpus = new Uint8Array(OPUS_FRAME_BYTES) // 静音 Opus 帧，音频关闭时填入音频子包
  let hapticSignal: Uint8Array[] = [] // 从音频提取的触觉 PCM 帧
  const emptyHaptic = new Uint8Array(HAPTIC_FRAME_BYTES) // 全 0 触觉，震动关闭时填入触觉子包
  const maskedHaptic = new Uint8Array(HAPTIC_FRAME_BYTES) // 左/右单马达时的掩码输出缓冲

  let ctx: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  let clockSource: AudioBufferSourceNode | null = null
  let gainNode: GainNode | null = null

  let startedAtCtxTime = 0
  let resumeOffset = 0
  let raf = 0
  let lastSentFrame = -1
  let sendSeq = 0
  let frameCounter = 0
  let startToken = 0 // 快速拖动时区分新旧 startFrom，丢弃过期的那次，避免并发产生多余 source

  function ensureCtx(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext()
      analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = 512
      analyserNode.smoothingTimeConstant = 0.8
      analyser.value = analyserNode
    }
    return ctx
  }

  // 触觉 PCM 为 L/R 交织（[L0,R0,L1,R1,...]）。左马达只留偶数字节(L)，右马达只留奇数字节(R)，双马达原样。
  function maskHaptic(src: Uint8Array): Uint8Array {
    const ch = hapticChannel.value
    if (ch === 'both') {
      return src
    }
    maskedHaptic.set(src)
    for (let j = 0; j < HAPTIC_FRAME_BYTES; j += 2) {
      if (ch === 'left') {
        maskedHaptic[j + 1] = 0 // 清右声道
      }
      else {
        maskedHaptic[j] = 0 // 清左声道
      }
    }
    return maskedHaptic
  }

  function sendFrame(index: number) {
    // 按开关实时选取子包内容
    const opus = audioEnabled.value
      ? musicOpus[Math.min(index, musicOpus.length - 1)]
      : silentOpus
    if (!opus) {
      return
    }
    let haptic = emptyHaptic
    if (hapticEnabled.value) {
      const src = hapticSignal[Math.min(index, hapticSignal.length - 1)]
      haptic = src ? maskHaptic(src) : emptyHaptic
    }
    const target = audioTarget.value === 'headphone' ? 'headphone' : 'speaker'
    const payload = buildReportSix(opus, haptic, sendSeq, frameCounter, target, audioVolume.value)
    device.value.device.sendReport(0x36, payload).catch((err) => {
      hidLogger.error('bt audio sendReport(0x36) failed', err)
      stop()
    })
    sendSeq = (sendSeq + 1) & 0x0F
    frameCounter = (frameCounter + 1) & 0xFF
  }

  function startRaf() {
    if (raf) {
      return
    }
    const tick = () => {
      if (ctx && isPlaying.value) {
        const t = resumeOffset + (ctx.currentTime - startedAtCtxTime)
        currentTime.value = Math.min(t, duration.value)
        // 按时钟追赶发送应发的帧（~10.667ms/帧）
        const targetFrame = Math.floor(currentTime.value / FRAME_DURATION_S)
        while (lastSentFrame < targetFrame) {
          lastSentFrame++
          sendFrame(lastSentFrame)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  function stopRaf() {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  function teardownSource() {
    if (clockSource) {
      clockSource.onended = null
      try {
        clockSource.stop()
      }
      catch { /* 可能已结束 */ }
      clockSource.disconnect()
      clockSource = null
    }
    gainNode?.disconnect()
    gainNode = null
  }

  function onEnded() {
    teardownSource()
    isPlaying.value = false
    resumeOffset = 0
    currentTime.value = duration.value
    stopRaf()
  }

  async function startFrom(offset: number) {
    if (!buffer48k) {
      return
    }
    const token = ++startToken
    const c = ensureCtx()
    await c.resume()
    if (token !== startToken) {
      return // 期间又触发了 seek/play，丢弃这次
    }

    clockSource = c.createBufferSource()
    clockSource.buffer = buffer48k
    clockSource.connect(analyserNode!)
    gainNode = c.createGain()
    gainNode.gain.value = syncToPC.value ? 1 : 0
    clockSource.connect(gainNode)
    gainNode.connect(c.destination)
    clockSource.onended = onEnded

    resumeOffset = offset
    startedAtCtxTime = c.currentTime
    lastSentFrame = Math.floor(offset / FRAME_DURATION_S) - 1
    clockSource.start(0, offset)
    isPlaying.value = true
    startRaf()
  }

  async function loadFile(file: File) {
    const decodeCtx = new AudioContext()
    let buffer45k: AudioBuffer | null = null
    try {
      const decoded = await decodeCtx.decodeAudioData(await file.arrayBuffer())
      buffer48k = await resampleStereo(decoded, 48000) // 用于时钟 / 频谱 / 触觉提取
      buffer45k = await resampleStereo(decoded, 45000) // 用于 Opus 编码（见 encodeOpusFrames 说明）
    }
    finally {
      void decodeCtx.close().catch(() => {})
    }

    if (isPlaying.value) {
      teardownSource()
      stopRaf()
      isPlaying.value = false
    }

    duration.value = buffer48k.duration
    // 音频与触觉两路都预编码备好，发送时按开关实时选取。
    musicOpus = await encodeOpusFrames(buffer45k!)
    silentOpus = await encodeSilentOpusFrame()
    hapticSignal = await extractHapticFrames(buffer48k, HAPTIC_GAIN)
    hidLogger.info(`bt audio: ${musicOpus.length} opus + ${hapticSignal.length} haptic frames ready`)

    resumeOffset = 0
    currentTime.value = 0
    fileName.value = file.name
    hasClip.value = true
  }

  async function play() {
    if (!hasClip.value || isPlaying.value) {
      return
    }
    sendSeq = 0
    frameCounter = 0
    const offset = resumeOffset >= duration.value - 0.05 ? 0 : resumeOffset
    try {
      await startFrom(offset)
    }
    catch (err) {
      hidLogger.error('bt audio play failed', err)
      isPlaying.value = false
    }
  }

  function pause() {
    if (!isPlaying.value || !ctx) {
      return
    }
    resumeOffset += ctx.currentTime - startedAtCtxTime
    teardownSource()
    isPlaying.value = false
    stopRaf()
    currentTime.value = Math.min(resumeOffset, duration.value)
  }

  function stop() {
    teardownSource()
    isPlaying.value = false
    stopRaf()
  }

  function seek(time: number) {
    if (!hasClip.value) {
      return
    }
    const target = Math.max(0, Math.min(time, duration.value))
    currentTime.value = target
    if (isPlaying.value) {
      teardownSource()
      void startFrom(target)
    }
    else {
      resumeOffset = target
    }
  }

  function dispose() {
    stopRaf()
    teardownSource()
    void ctx?.close().catch(() => {})
    ctx = null
    analyserNode = null
    analyser.value = null
    buffer48k = null
    musicOpus = []
    hapticSignal = []
  }

  // 蓝牙无关接口（与 useDualSensePlayer 对齐）的空实现。
  async function refreshOutputDevices() {}
  async function requestDeviceAccess() {}
  function hasNamedOutputs() {
    return false
  }
  async function setSinkDevice(_deviceId: string, _label?: string) {}
  async function selectOutputDevice() {}
  function setHapticChannel(channel: 'left' | 'right' | 'both') {
    hapticChannel.value = channel
  }

  // 「同步在电脑播放」播放中切换：直接改本地源增益，不打断 HID 音频流。
  watch(syncToPC, (v) => {
    if (gainNode) {
      gainNode.gain.value = v ? 1 : 0
    }
  })

  onScopeDispose(dispose)

  return {
    fileName,
    hasClip,
    isPlaying,
    currentTime,
    duration,
    syncToPC,
    audioEnabled,
    hapticEnabled,
    outputDevices,
    sinkId,
    sinkLabel,
    outputPickerSupported,
    hapticChannel,
    analyser,
    loadFile,
    play,
    pause,
    seek,
    refreshOutputDevices,
    requestDeviceAccess,
    hasNamedOutputs,
    setSinkDevice,
    selectOutputDevice,
    setHapticChannel,
    dispose,
  }
}
