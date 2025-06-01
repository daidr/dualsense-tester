import { fill } from 'lodash-es'

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

{
  const a = JSON.parse('[{"0":98,"1":0,"2":1,"3":0,"4":0,"5":0,"6":75,"7":0,"8":109,"9":0,"10":213,"11":0,"12":139,"13":0,"14":78,"15":0,"16":11,"17":0,"18":78,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0,"27":0,"28":0,"29":0,"30":0,"31":0,"32":0,"33":0,"34":0,"35":0,"36":0,"37":0,"38":0,"39":0,"40":0,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0,"51":0,"52":0,"53":0,"54":0,"55":0,"56":0,"57":0,"58":0,"59":0,"60":0,"61":0,"62":0,"63":0},{"0":98,"1":1,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0,"21":0,"22":0,"23":0,"24":0,"25":0,"26":0,"27":0,"28":207,"29":33,"30":16,"31":221,"32":188,"33":127,"34":232,"35":184,"36":14,"37":219,"38":31,"39":130,"40":87,"41":242,"42":8,"43":36,"44":3,"45":0,"46":0,"47":128,"48":128,"49":196,"50":196,"51":225,"52":225,"53":3,"54":0,"55":0,"56":126,"57":50,"58":203,"59":204,"60":0,"61":0,"62":0,"63":0},{"0":98,"1":2,"2":255,"3":255,"4":0,"5":179,"6":153,"7":255,"8":0,"9":0,"10":0,"11":1,"12":2,"13":3,"14":4,"15":5,"16":6,"17":7,"18":8,"19":9,"20":10,"21":11,"22":12,"23":13,"24":14,"25":15,"26":0,"27":0,"28":0,"29":0,"30":0,"31":0,"32":5,"33":0,"34":28,"35":85,"36":187,"37":5,"38":135,"39":1,"40":0,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0,"51":0,"52":0,"53":0,"54":0,"55":0,"56":0,"57":0,"58":0,"59":0,"60":0,"61":0,"62":0,"63":0}]')
  a[0].length = a[1].length = a[2].length = 64
  a[0] = new Uint8Array(a[0])
  a[1] = new Uint8Array(a[1])
  a[2] = new Uint8Array(a[2])
  fillProfileArrayReportChecksum(a)
  console.log('测试', new Uint8Array(a[2].buffer.slice(56, 60)))
}
