export function formatFirmwareTime(firmwareTime: string): string {
  return `${firmwareTime.slice(0, -8)} ${firmwareTime.slice(-8)}`
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function timestampToLEBuffer(timestamp: number): ArrayBuffer {
  const buffer = new ArrayBuffer(6)
  const view = new DataView(buffer)
  view.setUint32(0, timestamp & 0xFFFFFFFF, true)
  view.setUint16(4, Math.floor(timestamp / 0x100000000), true)
  return buffer
}

export function leBufferToTimestamp(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  let timestamp = 0
  timestamp += view.getUint32(0, true)
  timestamp += view.getUint16(4, true) * 0x100000000
  return timestamp
}
