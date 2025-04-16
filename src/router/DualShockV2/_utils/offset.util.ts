export const inputReportOffsetUSB = createInputReportOffset(true)
export const inputReportOffsetBluetooth = createInputReportOffset(false)

export function createInputReportOffset(usb: boolean) {
  const num = usb ? 0 : 2
  const offset = {
    analogStickLX: 0 + num,
    analogStickLY: 1 + num,
    analogStickRX: 2 + num,
    analogStickRY: 3 + num,
    digitalKeys: 4 + num, // 3
    sequenceNum: 6 + num, // 1
    analogTriggerL: 7 + num,
    analogTriggerR: 8 + num,
    motionTimeStamp: 9 + num,
    motionTemperature: 11 + num,
    gyroPitch: 12 + num,
    gyroYaw: 14 + num,
    gyroRoll: 16 + num,
    accelX: 18 + num,
    accelY: 20 + num,
    accelZ: 22 + num,
    reserved2: 24 + num,
    status: 29 + num,
    reserved3: 31 + num,
    touchData: 34 + num,
    seqTag: 0,
    crc32: 0,
  }

  if (!usb) {
    offset.crc32 = 73
  }

  return offset
}
