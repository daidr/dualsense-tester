export function hexToRgb(hex: string): [number, number, number] {
  const hexCode = hex.replace(/^#/, '')
  const r = Number.parseInt(hexCode.substring(0, 2), 16)
  const g = Number.parseInt(hexCode.substring(2, 4), 16)
  const b = Number.parseInt(hexCode.substring(4, 6), 16)
  return [r, g, b]
}

export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`
}
