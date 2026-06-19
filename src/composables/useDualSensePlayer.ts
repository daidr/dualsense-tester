import type { Ref } from 'vue'
import { onScopeDispose, ref, shallowRef, watch } from 'vue'
import { uiLogger } from '@/utils/logger.util'

/**
 * USB 连接下的文件播放器内核（蓝牙由 useBtAudioPlayer 实现，两者接口兼容，
 * 由 MediaFilePlayer 按连接类型分派）。
 *
 * 负责：解码音频 → AudioBuffer；基于 AudioBufferSourceNode 的播放/暂停/拖动；AnalyserNode 频谱；
 * 通过 AudioContext.setSinkId 路由到 DualSense 声卡；按 audioEnabled/hapticEnabled 把音频送到
 * 声卡前 2 声道(扬声器)、触觉送到后 2 声道(马达)；可选「同步在电脑播放」。
 *
 * 扬声器/耳机的 HID 音量切换属设备副作用，由集成层（widget）处理。
 */
export function useDualSensePlayer(options: { audioEnabled: Ref<boolean>, hapticEnabled: Ref<boolean>, hapticGain: Ref<number> }) {
  // 音频→声卡前 2 声道(ch0/ch1=扬声器)，触觉→后 2 声道(ch2/ch3=左右马达)，按开关组合。
  const { audioEnabled, hapticEnabled, hapticGain } = options

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
  // buildGraph 创建的中间节点，teardown 时统一断开。
  let graphNodes: AudioNode[] = []
  // 触觉通道的增益节点，单独留引用以便实时调强度（无需重建图）。
  let hapticGainNode: GainNode | null = null

  let startedAtCtxTime = 0
  let resumeOffset = 0
  let raf = 0
  let startToken = 0 // 快速拖动时区分新旧 startFrom，丢弃过期的那次，避免并发产生多余 source

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
    graphNodes.forEach(node => node.disconnect())
    graphNodes = []
    hapticGainNode = null
  }

  // 触觉强度滑块（百分比）→ 增益系数；负数夹到 0。
  function currentHapticGain(): number {
    return Math.max(0, hapticGain.value / 100)
  }

  /** 构建输出图：频谱接 analyser；音频→声卡 ch0/ch1(扬声器)、触觉→ch2/ch3(马达)，按开关组合。 */
  function buildGraph(source: AudioBufferSourceNode, ctx: AudioContext) {
    source.connect(analyserNode!)
    const needHaptic = hapticEnabled.value
    const maxChannels = ctx.destination.maxChannelCount
    // 仅音频且声卡只有立体声：直连 analyser→destination 即可。
    if (!needHaptic && maxChannels < 4) {
      analyserNode!.connect(ctx.destination)
      return
    }
    const channels = Math.min(4, maxChannels)
    try {
      ctx.destination.channelCount = channels
      ctx.destination.channelCountMode = 'explicit'
      ctx.destination.channelInterpretation = 'discrete'
    }
    catch (error) {
      uiLogger.warn('multi-channel destination failed', error)
    }
    uiLogger.info(`output graph: maxChannelCount=${maxChannels}, ch=${channels}, audio=${audioEnabled.value}, haptic=${needHaptic}`)
    const merger = ctx.createChannelMerger(channels)
    graphNodes.push(merger)
    if (audioEnabled.value) {
      // 音频 → ch0/ch1（扬声器），不经增益（音量走 HID）
      const audioSplitter = ctx.createChannelSplitter(2)
      source.connect(audioSplitter)
      audioSplitter.connect(merger, 0, 0)
      audioSplitter.connect(merger, 1, Math.min(1, channels - 1))
      graphNodes.push(audioSplitter)
    }
    if (needHaptic) {
      // 触觉 → ch2/ch3（4 声道时）；声卡 <4 声道则降级到 ch0/ch1。
      // 触觉单独走一个 GainNode 做强度缩放，不影响音频通道。
      const leftCh = channels >= 4 ? 2 : 0
      const rightCh = channels >= 4 ? 3 : Math.min(1, channels - 1)
      const gain = ctx.createGain()
      gain.gain.value = currentHapticGain()
      source.connect(gain)
      const hapticSplitter = ctx.createChannelSplitter(2)
      gain.connect(hapticSplitter)
      if (hapticChannel.value !== 'right') {
        hapticSplitter.connect(merger, 0, leftCh)
      }
      if (hapticChannel.value !== 'left') {
        hapticSplitter.connect(merger, 1, rightCh)
      }
      hapticGainNode = gain
      graphNodes.push(gain, hapticSplitter)
    }
    merger.connect(ctx.destination)
  }

  /** 从 offset 处开始实际播放（创建新的 source 节点）。 */
  async function startFrom(offset: number) {
    if (!buffer) {
      return
    }
    const token = ++startToken
    const ctx = ensureMainCtx()
    await ctx.resume()
    await applySinkId(ctx)
    if (token !== startToken) {
      return // 期间又触发了 seek/play，丢弃这次
    }

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

  /** 播放中从当前位置重连输出图（开关 / 声道变化时调用）。 */
  function rebuildGraphIfPlaying() {
    if (isPlaying.value && mainCtx) {
      const offset = Math.min(resumeOffset + (mainCtx.currentTime - startedAtCtxTime), duration.value)
      teardownSources()
      void startFrom(offset)
    }
  }

  /** 切换触觉声道路由（左/右/双马达）；播放中会从当前位置重连输出图。 */
  function setHapticChannel(channel: 'left' | 'right' | 'both') {
    hapticChannel.value = channel
    rebuildGraphIfPlaying()
  }

  // 音频/震动开关变化时，播放中实时重连输出图（无需重新加载文件）。
  watch([audioEnabled, hapticEnabled], rebuildGraphIfPlaying)

  // 触觉强度变化：直接调增益节点，无需重建图（播放中即时生效）。
  watch(hapticGain, () => {
    if (hapticGainNode) {
      hapticGainNode.gain.value = currentHapticGain()
    }
  })

  // 「同步在电脑播放」播放中切换：动态开/关第二路本地播放，不打断 DualSense 声卡输出。
  watch(syncToPC, (v) => {
    if (!isPlaying.value || !mainCtx || !buffer) {
      return
    }
    if (v && !localSource) {
      const offset = Math.min(resumeOffset + (mainCtx.currentTime - startedAtCtxTime), duration.value)
      if (!localCtx) {
        localCtx = new AudioContext()
      }
      void localCtx.resume()
      localSource = localCtx.createBufferSource()
      localSource.buffer = buffer
      localSource.connect(localCtx.destination)
      localSource.start(0, offset)
    }
    else if (!v && localSource) {
      try {
        localSource.stop()
      }
      catch { /* 可能已结束 */ }
      localSource.disconnect()
      localSource = null
    }
  })

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
    audioEnabled,
    hapticEnabled,
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
