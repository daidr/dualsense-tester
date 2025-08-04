// Generate CRC32 lookup table.
export function makeCRCTable() {
  let c
  const crcTable: number[] = []
  for (let n = 0; n < 256; ++n) {
    c = n
    for (let k = 0; k < 8; ++k) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  return crcTable
}

declare global {
  interface Window {
    crcTable: number[]
  }
}

// Compute CRC32 for `prefixBytes` concatenated with `dataView`.
export function crc32(prefixBytes: number[], dataView: DataView, suffixBytes: number[] = []): number {
  if (window.crcTable === undefined)
    window.crcTable = makeCRCTable()
  let crc = -1 >>> 0
  for (const byte of prefixBytes) crc = (crc >>> 8) ^ window.crcTable[(crc ^ byte) & 0xFF]
  for (let i = 0; i < dataView.byteLength; ++i)
    crc = (crc >>> 8) ^ window.crcTable[(crc ^ dataView.getUint8(i)) & 0xFF]
  for (const byte of suffixBytes) crc = (crc >>> 8) ^ window.crcTable[(crc ^ byte) & 0xFF]
  return (crc ^ -1) >>> 0
}

// Given a DualSense Bluetooth output report with `reportId` and `reportData`,
// compute the CRC32 checksum and write it to the last four bytes of `reportData`.
export function fillOutputReportChecksum(reportId: number, reportData: Uint8Array) {
  const crc = crc32([0xA2, reportId], new DataView(reportData.buffer, 0, reportData.byteLength - 4))
  reportData[reportData.byteLength - 4] = (crc >>> 0) & 0xFF
  reportData[reportData.byteLength - 3] = (crc >>> 8) & 0xFF
  reportData[reportData.byteLength - 2] = (crc >>> 16) & 0xFF
  reportData[reportData.byteLength - 1] = (crc >>> 24) & 0xFF
}

export function fillFeatureReportChecksum(reportId: number, reportData: Uint8Array) {
  const crc = crc32([0x53, reportId], new DataView(reportData.buffer, 0, reportData.byteLength - 4))
  reportData[reportData.byteLength - 4] = (crc >>> 0) & 0xFF
  reportData[reportData.byteLength - 3] = (crc >>> 8) & 0xFF
  reportData[reportData.byteLength - 2] = (crc >>> 16) & 0xFF
  reportData[reportData.byteLength - 1] = (crc >>> 24) & 0xFF
}

export function fillProfileArrayReportChecksum(byteArray: Uint8Array[]) {
  const bufferArray = new Uint8Array(170)

  for (let i = 0; i < byteArray.length; i++) {
    if (i === byteArray.length - 1) {
      bufferArray.set(byteArray[i].slice(2, 56), i * 58)
    }
    else {
      bufferArray.set(byteArray[i].slice(2, 60), i * 58)
    }
  }

  const crc = crc32([], new DataView(bufferArray.buffer, 0, bufferArray.byteLength))
  byteArray[2][byteArray[2].byteLength - 8] = (crc >>> 0) & 0xFF
  byteArray[2][byteArray[2].byteLength - 7] = (crc >>> 8) & 0xFF
  byteArray[2][byteArray[2].byteLength - 6] = (crc >>> 16) & 0xFF
  byteArray[2][byteArray[2].byteLength - 5] = (crc >>> 24) & 0xFF
}
