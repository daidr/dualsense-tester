import { onScopeDispose, ref, shallowRef } from 'vue'
import { uiLogger } from '@/utils/logger.util'

/**
 * 通用的 DualSense 文件播放器内核（MVP 阶段仅实现 USB / setSinkId 路径）。
 *
 * 负责：解码音频文件 → AudioBuffer；基于 AudioBufferSourceNode 的播放/暂停/拖动；
 * AnalyserNode 频谱数据；通过 AudioContext.setSinkId 把音频路由到指定输出端点（DualSense 声卡）；
 * 可选的「同步在电脑播放」（第二个默认 sink 的 AudioContext 播同一 buffer）。
 *
 * 不含「扬声器/耳机」或「触觉声道」等设备特定的副作用，那些由集成层（widget）处理。
 */
export function useDualSensePlayer(options: { haptic?: boolean } = {}) {
  // 触觉模式：把音频路由到 USB 声卡的后 2 声道（ch2/ch3 = 左/右触觉马达），而非扬声器(ch0/1)。
  const isHaptic = options.haptic ?? false

  const fileName = ref('')
  const hasClip = ref(false)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const syncToPC = ref(false)
  /** 触觉声道路由：左马达(ch2) / 右马达(ch3) / 双马达。 */
  const hapticChannel = ref<'left' | 'right' | 'both'>('both')

  /** 可选的输出端点列表（audiooutput），label 需要媒体权限才可见。 */
  const outputDevices = shallowRef<MediaDeviceInfo[]>([])
  /** 当前 setSinkId 目标设备 id，'' 表示系统默认输出。 */
  const sinkId = ref('')
  /** 当前输出端点的设备名（经 selectAudioOutput 选择后可得）。 */
  const sinkLabel = ref('')
  /** 浏览器是否支持原生输出设备选择器。 */
  const outputPickerSupported = ref(
    typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && typeof (navigator.mediaDevices as unknown as { selectAudioOutput?: unknown }).selectAudioOutput === 'function',
  )

  /** 供频谱组件读取的 AnalyserNode。 */
  const analyser = shallowRef<AnalyserNode | null>(null)

  let buffer: AudioBuffer | null = null

  let mainCtx: AudioContext | null = null
  let localCtx: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  let mainSource: AudioBufferSourceNode | null = null
  let localSource: AudioBufferSourceNode | null = null
  let hapticSplitter: ChannelSplitterNode | null = null
  let hapticMerger: ChannelMergerNode | null = null

  let startedAtCtxTime = 0
  let resumeOffset = 0
  let raf = 0

  function supportsSetSinkId(ctx: AudioContext): boolean {
    return typeof (ctx as unknown as { setSinkId?: unknown }).setSinkId === 'function'
  }

  function ensureMainCtx(): AudioContext {
    if (!mainCtx) {
      mainCtx = new AudioContext()
      analyserNode = mainCtx.createAnalyser()
      analyserNode.fftSize = 512
      analyserNode.smoothingTimeConstant = 0.8
      analyser.value = analyserNode
    }
    return mainCtx
  }

  async function applySinkId(ctx: AudioContext) {
    if (!supportsSetSinkId(ctx)) {
      return
    }
    try {
      await (ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(sinkId.value)
    }
    catch (error) {
      uiLogger.warn('setSinkId failed', error)
    }
  }

  function startRaf() {
    if (raf) {
      return
    }
    const tick = () => {
      if (mainCtx && isPlaying.value) {
        const elapsed = mainCtx.currentTime - startedAtCtxTime
        currentTime.value = Math.min(resumeOffset + elapsed, duration.value)
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

  function teardownSources() {
    // 先摘掉 onended，避免手动 stop() 异步触发自然结束逻辑（否则暂停会跳到结尾）。
    if (mainSource) {
      mainSource.onended = null
      try {
        mainSource.stop()
      }
      catch { /* source 可能已结束 */ }
      mainSource.disconnect()
      mainSource = null
    }
    if (localSource) {
      try {
        localSource.stop()
      }
      catch { /* source 可能已结束 */ }
      localSource.disconnect()
      localSource = null
    }
    hapticSplitter?.disconnect()
    hapticMerger?.disconnect()
    hapticSplitter = null
    hapticMerger = null
  }

  /** 构建输出图：音频经 analyser 出扬声器；触觉拆成 L/R 路由到声卡 ch2/ch3。 */
  function buildGraph(source: AudioBufferSourceNode, ctx: AudioContext) {
    source.connect(analyserNode!)
    if (!isHaptic) {
      analyserNode!.connect(ctx.destination)
      return
    }
    const maxChannels = ctx.destination.maxChannelCount
    const channels = Math.min(4, maxChannels)
    try {
      ctx.destination.channelCount = channels
      ctx.destination.channelCountMode = 'explicit'
      ctx.destination.channelInterpretation = 'discrete'
    }
    catch (error) {
      uiLogger.warn('haptic: set multi-channel destination failed', error)
    }
    uiLogger.info(`haptic output: maxChannelCount=${maxChannels}, using ${channels}ch`)
    const splitter = ctx.createChannelSplitter(2)
    const merger = ctx.createChannelMerger(channels)
    source.connect(splitter)
    // 4 声道时路由到 ch2/ch3（触觉马达）；否则降级到 ch0/ch1。
    const leftCh = channels >= 4 ? 2 : 0
    const rightCh = channels >= 4 ? 3 : Math.min(1, channels - 1)
    if (hapticChannel.value !== 'right') {
      splitter.connect(merger, 0, leftCh)
    }
    if (hapticChannel.value !== 'left') {
      splitter.connect(merger, 1, rightCh)
    }
    merger.connect(ctx.destination)
    hapticSplitter = splitter
    hapticMerger = merger
  }

  /** 从 offset 处开始实际播放（创建新的 source 节点）。 */
  async function startFrom(offset: number) {
    if (!buffer) {
      return
    }
    const ctx = ensureMainCtx()
    await ctx.resume()
    await applySinkId(ctx)

    mainSource = ctx.createBufferSource()
    mainSource.buffer = buffer
    buildGraph(mainSource, ctx)
    mainSource.onended = onSourceEnded

    if (syncToPC.value) {
      if (!localCtx) {
        localCtx = new AudioContext()
      }
      await localCtx.resume()
      localSource = localCtx.createBufferSource()
      localSource.buffer = buffer
      localSource.connect(localCtx.destination)
    }

    resumeOffset = offset
    startedAtCtxTime = ctx.currentTime
    mainSource.start(0, offset)
    localSource?.start(0, offset)

    isPlaying.value = true
    startRaf()
  }

  function onSourceEnded() {
    // 仅在自然播放结束时触发（手动停止已摘除 onended）。
    mainSource = null
    localSource = null
    isPlaying.value = false
    resumeOffset = 0
    currentTime.value = duration.value
    stopRaf()
  }

  async function loadFile(file: File) {
    const ctx = ensureMainCtx()
    const arrayBuffer = await file.arrayBuffer()
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    // 切换素材前先停掉旧的播放
    if (isPlaying.value) {
      teardownSources()
    }
    buffer = decoded
    duration.value = decoded.duration
    resumeOffset = 0
    currentTime.value = 0
    isPlaying.value = false
    stopRaf()
    fileName.value = file.name
    hasClip.value = true
  }

  async function play() {
    if (!hasClip.value || isPlaying.value) {
      return
    }
    // 已播放到结尾则从头开始
    const offset = resumeOffset >= duration.value - 0.05 ? 0 : resumeOffset
    try {
      await startFrom(offset)
    }
    catch (error) {
      uiLogger.error('play failed', error)
      isPlaying.value = false
    }
  }

  function pause() {
    if (!isPlaying.value || !mainCtx) {
      return
    }
    resumeOffset += mainCtx.currentTime - startedAtCtxTime
    teardownSources()
    isPlaying.value = false
    stopRaf()
    currentTime.value = Math.min(resumeOffset, duration.value)
  }

  function seek(time: number) {
    if (!hasClip.value) {
      return
    }
    const target = Math.max(0, Math.min(time, duration.value))
    currentTime.value = target
    if (isPlaying.value) {
      teardownSources()
      void startFrom(target)
    }
    else {
      resumeOffset = target
    }
  }

  /** 切换触觉声道路由（左/右/双马达）；播放中会从当前位置重连输出图。 */
  function setHapticChannel(channel: 'left' | 'right' | 'both') {
    hapticChannel.value = channel
    if (isPlaying.value && mainCtx) {
      const offset = Math.min(resumeOffset + (mainCtx.currentTime - startedAtCtxTime), duration.value)
      teardownSources()
      void startFrom(offset)
    }
  }

  async function refreshOutputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      outputDevices.value = devices.filter(device => device.kind === 'audiooutput')
    }
    catch (error) {
      uiLogger.warn('enumerateDevices failed', error)
    }
  }

  /** 是否已拿到带名字的输出端点（无名字说明缺少媒体权限）。 */
  function hasNamedOutputs(): boolean {
    return outputDevices.value.some(device => device.deviceId && device.label)
  }

  /**
   * 无 selectAudioOutput 的浏览器回退：请求一次媒体权限以解锁设备名（audiooutput 的 label
   * 需要任意媒体权限才可见），随后刷新设备列表。
   */
  async function requestDeviceAccess() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      await refreshOutputDevices()
    }
    catch (error) {
      uiLogger.warn('requestDeviceAccess denied', error)
    }
  }

  /** 设置 setSinkId 目标；播放中会即时切换端点。 */
  async function setSinkDevice(deviceId: string, label = '') {
    sinkId.value = deviceId
    sinkLabel.value = label
    if (mainCtx) {
      await applySinkId(mainCtx)
    }
  }

  /** 用浏览器原生选择器让用户选输出端点（用户手势触发，无需媒体权限即可拿到设备名）。 */
  async function selectOutputDevice() {
    const md = navigator.mediaDevices as unknown as { selectAudioOutput?: () => Promise<MediaDeviceInfo> }
    if (typeof md.selectAudioOutput !== 'function') {
      return
    }
    try {
      ensureMainCtx()
      const info = await md.selectAudioOutput()
      await setSinkDevice(info.deviceId, info.label)
    }
    catch (error) {
      uiLogger.warn('selectAudioOutput cancelled or failed', error)
    }
  }

  function dispose() {
    stopRaf()
    teardownSources()
    void mainCtx?.close().catch(() => {})
    void localCtx?.close().catch(() => {})
    mainCtx = null
    localCtx = null
    analyserNode = null
    analyser.value = null
    buffer = null
  }

  onScopeDispose(dispose)

  return {
    fileName,
    hasClip,
    isPlaying,
    currentTime,
    duration,
    syncToPC,
    outputDevices,
    sinkId,
    sinkLabel,
    outputPickerSupported,
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
    hapticChannel,
    setHapticChannel,
    dispose,
  }
}

export type DualSensePlayer = ReturnType<typeof useDualSensePlayer>
