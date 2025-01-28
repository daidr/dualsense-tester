export function formatFirmwareTime(firmwareTime: string): string {
  return `${firmwareTime.slice(0, -8)} ${firmwareTime.slice(-8)}`
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
