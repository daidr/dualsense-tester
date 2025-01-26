import { shiftJISDecoder } from './decoder.util'

export function numberToHex(value: number | bigint, length = 0) {
  return value.toString(16).padStart(length, '0').toUpperCase()
}

export function numberToXHex(value: number | bigint, length = 0) {
  return `0x${numberToHex(value, length)}`
}

export function mapDataViewToU8Hex(dataView: DataView, littleEndian = false) {
  const result: string[] = []
  for (let i = 0; i < dataView.byteLength; i++) {
    result.push(numberToHex(dataView.getUint8(i), 2))
  }
  return littleEndian ? result.reverse().join('') : result.join('')
}

export function decodeShiftJIS(dataView?: DataView) {
  if (!dataView) {
    return ''
  }
  return shiftJISDecoder.decode(dataView).replace(/\0/g, '')
}

export function numberToMacAddress(value: bigint) {
  return value.toString(16).padStart(12, '0').toUpperCase().replace(/(.{2})/g, '$1:').slice(0, -1)
}

export function pairedValue(left: string | undefined, right: string | undefined, formatter?: (value: string | undefined) => string) {
  let finalString = ''
  if (left) {
    finalString += `${formatter?.(left) ?? left} (L)\n`
  }
  if (right) {
    finalString += `${formatter?.(right) ?? right} (R)\n`
  }
  return finalString.trim()
}

export function notAllFalsy(...args: unknown[]) {
  return args.some(arg => !!arg)
}

export function bitShiftByte(value: number, shift: number) {
  return (value << shift) & 0xFF
}
