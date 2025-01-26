export const inputReportOffsetUSB = createInputReportOffset(true)
export const inputReportOffsetBluetooth = createInputReportOffset(false)

export function createInputReportOffset(usb: boolean) {
  const num = usb ? 0 : 1
  const offset = {
    analogStickLX: 0 + num,
    analogStickLY: 1 + num,
    analogStickRX: 2 + num,
    analogStickRY: 3 + num,
    analogTriggerL: 4 + num,
    analogTriggerR: 5 + num,
    sequenceNum: 6 + num,
    digitalKeys: 7 + num,
    incrementalNumber: 11 + num,
    gyroPitch: 15 + num,
    gyroYaw: 17 + num,
    gyroRoll: 19 + num,
    accelX: 21 + num,
    accelY: 23 + num,
    accelZ: 25 + num,
    motionTimeStamp: 27 + num,
    motionTemperature: 31 + num,
    touchData: 32 + num,
    atStatus0: 41 + num,
    atStatus1: 42 + num,
    hostTimestamp: 43 + num,
    atStatus2: 47 + num,
    deviceTimestamp: 48 + num,
    status0: 52 + num,
    status1: 53 + num,
    status2: 54 + num,
    aesCmac: 55 + num,
    seqTag: 0,
    crc32: 0,
  }

  if (!usb) {
    offset.sequenceNum = 0
    offset.crc32 = 73
  }

  return offset
}
