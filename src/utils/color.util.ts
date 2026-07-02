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

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    [r, g, b] = [c, x, 0]
  }
  else if (h < 120) {
    [r, g, b] = [x, c, 0]
  }
  else if (h < 180) {
    [r, g, b] = [0, c, x]
  }
  else if (h < 240) {
    [r, g, b] = [0, x, c]
  }
  else if (h < 300) {
    [r, g, b] = [x, 0, c]
  }
  else {
    [r, g, b] = [c, 0, x]
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}
