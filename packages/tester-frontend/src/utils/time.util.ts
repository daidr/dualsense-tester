export function formatFirmwareTime(firmwareTime: string): string {
  return `${firmwareTime.slice(0, -8)} ${firmwareTime.slice(-8)}`
}
