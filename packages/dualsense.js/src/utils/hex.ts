export function hex8(value: number) {
  return (`00${(value >>> 0).toString(16)}`).slice(-2)
}

export function hex16(value: number) {
  return (`0000${(value >>> 0).toString(16)}`).slice(-4)
}
export function hex32(value: number) {
  return (`00000000${(value >>> 0).toString(16)}`).slice(-8)
}
