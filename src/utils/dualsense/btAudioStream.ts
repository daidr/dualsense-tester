import { fillOutputReportChecksum } from './crc32.util'

/**
 * 蓝牙音频流的纯函数：Opus 编码、触觉 PCM 提取、0x36 输出报告打包。
 * 无状态，播放调度与发送在 useBtAudioPlayer。
 */

export const OPUS_FRAME_BYTES = 200
export const HAPTIC_FRAME_BYTES = 64
export const REPORT_SIX_PAYLOAD_LEN = 397 // 0x36 报告共 398 字节，减去 report id

const OPUS_FRAME_MS = 10
const HAPTIC_RATE = 3000 // 触觉重采样目标采样率（低频，贴合马达）
const HAPTIC_SAMPLES_PER_FRAME = 32 // 64 字节 / 2 声道
const FLAGS_NIBBLE = 0x0 // 报告头标志位，恒为 0

function floatToInt8Byte(f: number): number {
  return (Math.round(Math.max(-1, Math.min(1, f)) * 127)) & 0xFF
}

/** 把 AudioBuffer 重采样到指定采样率（2 声道）。 */
export async function resampleStereo(buffer: AudioBuffer, sampleRate: number): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(2, Math.ceil(buffer.duration * sampleRate), sampleRate)
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start()
  return offline.startRendering()
}

/**
 * 用 WebCodecs 编码 Opus（48k/2ch/160k CBR/10ms，每帧固定 200 字节）。
 *
 * 输入应为「已重采样到 45k」的 buffer，但仍按 48k 标称编码：手柄蓝牙以约 45k 的速率消费音频，
 * 这样每帧实际代表约 10.667ms 音频、音高才正确。
 * application 必须用 'lowdelay'（纯 CELT）
 */
export async function encodeOpusFrames(buffer: AudioBuffer): Promise<Uint8Array[]> {
  const frames: Uint8Array[] = []
  let encodeError: unknown = null

  const encoder = new AudioEncoder({
    output: (chunk) => {
      const raw = new Uint8Array(chunk.byteLength)
      chunk.copyTo(raw)
      // CBR 160k@10ms 下每帧恒为 200 字节
      const frame = new Uint8Array(OPUS_FRAME_BYTES)
      frame.set(raw.subarray(0, OPUS_FRAME_BYTES))
      frames.push(frame)
    },
    error: (err) => {
      encodeError = err
    },
  })

  encoder.configure({
    codec: 'opus',
    sampleRate: 48000,
    numberOfChannels: 2,
    bitrate: 160000,
    bitrateMode: 'constant',
    opus: {
      format: 'opus',
      frameDuration: OPUS_FRAME_MS * 1000,
      application: 'lowdelay',
      signal: 'music',
      complexity: 1,
    },
  })

  const ch0 = buffer.getChannelData(0)
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0
  const planar = new Float32Array(ch0.length + ch1.length)
  planar.set(ch0, 0)
  planar.set(ch1, ch0.length)

  const audioData = new AudioData({
    format: 'f32-planar',
    sampleRate: 48000, // 标称 48k，配合「输入已重采样到 45k」实现正确音高
    numberOfFrames: ch0.length,
    numberOfChannels: 2,
    timestamp: 0,
    data: planar,
  })
  encoder.encode(audioData)
  audioData.close()
  await encoder.flush()
  encoder.close()

  if (encodeError) {
    throw encodeError
  }
  return frames
}

/** 编码一帧 10ms 静音 Opus：只震动不出声时，音频子包填入它。 */
export async function encodeSilentOpusFrame(): Promise<Uint8Array> {
  const ctx = new OfflineAudioContext(2, 480, 48000)
  const silent = ctx.createBuffer(2, 480, 48000)
  const frames = await encodeOpusFrames(silent)
  return frames[0] ?? new Uint8Array(OPUS_FRAME_BYTES)
}

/**
 * 从音频提取触觉 PCM：重采样到 3000Hz → int8 → 每帧 64 字节（32 样本/声道，左右声道交织）。
 * gain 用于放大触觉强度（音乐直接当触觉信号通常偏弱）。
 */
export async function extractHapticFrames(buffer: AudioBuffer, gain = 1): Promise<Uint8Array[]> {
  const total = Math.ceil(buffer.duration * HAPTIC_RATE)
  const offline = new OfflineAudioContext(2, total, HAPTIC_RATE)
  const src = offline.createBufferSource()
  src.buffer = buffer
  const gainNode = offline.createGain()
  gainNode.gain.value = gain
  src.connect(gainNode)
  gainNode.connect(offline.destination)
  src.start()
  const resampled = await offline.startRendering()

  const left = resampled.getChannelData(0)
  const right = resampled.numberOfChannels > 1 ? resampled.getChannelData(1) : left

  const frames: Uint8Array[] = []
  for (let start = 0; start < total; start += HAPTIC_SAMPLES_PER_FRAME) {
    const frame = new Uint8Array(HAPTIC_FRAME_BYTES)
    for (let j = 0; j < HAPTIC_SAMPLES_PER_FRAME; j++) {
      const s = start + j
      if (s < total) {
        frame[j * 2] = floatToInt8Byte(left[s])
        frame[j * 2 + 1] = floatToInt8Byte(right[s])
      }
    }
    frames.push(frame)
  }
  return frames
}

/**
 * 组装一个完整的 0x36 输出报告 payload（397 字节，不含 report id），并写好末尾 CRC。
 * 报告由「控制数据子包 + 音频子包 + 触觉子包」拼成；payload 索引 = 报告内偏移 − 1。
 */
export function buildReportSix(
  opusFrame: Uint8Array,
  hapticFrame: Uint8Array,
  seq: number,
  frameCounter: number,
  audioTarget: 'speaker' | 'headphone' = 'speaker',
  volume = 0x4B,
): Uint8Array {
  const p = new Uint8Array(REPORT_SIX_PAYLOAD_LEN)
  p[0] = ((seq & 0x0F) << 4) | FLAGS_NIBBLE // 序列号(高4位) + 标志(低4位)

  // 控制数据子包：只点亮「音频」相关的 valid_flag 位，其余位与字段留 0。
  // 这样手柄会忽略灯条/玩家灯/静音灯/震动/扳机字段、维持输出面板设置的状态，不被音频流覆盖。
  p[1] = 0x90 // 子包标记
  p[2] = 0x3F
  // 扬声器用 valid_flag0 的 bit5(扬声器音量)+bit7(音频控制)；耳机用 bit4(耳机音量)+bit7。
  if (audioTarget === 'headphone') {
    p[3] = 0x90
    p[7] = volume & 0xFF // 耳机音量
  }
  else {
    p[3] = 0xA0
    p[8] = volume & 0xFF // 扬声器音量
  }
  p[4] = 0x00 // valid_flag1：不碰静音灯/玩家灯/灯条/省电
  p[10] = 0x09 // audioControl

  // 音频子包
  p[66] = 0x91 // 子包标记
  p[67] = 0x07
  p[68] = 0xFE
  p[69] = 0x40 // 延迟/混音参数 ×5
  p[70] = 0x40
  p[71] = 0x40
  p[72] = 0x40
  p[73] = 0x40
  p[74] = frameCounter & 0xFF // 音频帧序号，每包递增
  p[75] = audioTarget === 'headphone' ? 0x96 : 0x93 // 输出路由标签：扬声器 / 耳机
  p[76] = 0xC8 // Opus 帧长度 200
  p.set(opusFrame.subarray(0, OPUS_FRAME_BYTES), 77)

  // 触觉子包
  p[277] = 0x92 // 子包标记
  p[278] = 0x40 // PCM 块长度 64
  p.set(hapticFrame.subarray(0, HAPTIC_FRAME_BYTES), 279)

  // 末 4 字节写 CRC32
  fillOutputReportChecksum(0x36, p)
  return p
}
