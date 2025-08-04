import type { DeviceItem } from '@/device-based-router/shared'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { hidLogger } from '../logger.util'
import { fillFeatureReportChecksum, fillOutputReportChecksum } from './crc32.util'

export function sendOutputReportFactory(item: DeviceItem) {
  const { device, connectionType } = item

  if (connectionType === DeviceConnectionType.USB) {
    return async function sendOutputReport(data: ArrayBuffer) {
      hidLogger.debug('sendOutputReport', 'USB', data)
      await device.sendReport(0x05, new Uint8Array(data))
    }
  }
  return async function sendOutputReport(data: ArrayBuffer) {
    const newData = new Uint8Array(77)
    newData.set(new Uint8Array(data), 0)
    fillOutputReportChecksum(0x11, newData)
    hidLogger.debug('sendOutputReport', 'Bluetooth', newData)

    await device.sendReport(0x11, newData)
  }
}

export async function sendFeatureReport(item: DeviceItem, reportId: number, data: ArrayBuffer) {
  const { device, connectionType } = item
  const featureReportMeta = device.collections[0]?.featureReports?.find(report => report.reportId === reportId)
  if (!featureReportMeta) {
    throw new Error('Feature report not found')
  }
  const idealLength = featureReportMeta.items?.[0]?.reportCount ?? 0
  // const idealLength = featureReportMeta.items?.reduce((sum, item) => sum + (item?.reportCount ?? 0), 0)
  if (!idealLength) {
    throw new Error('Invalid feature report')
  }
  // if (data.byteLength > idealLength) {
  //   throw new Error('Data too long')
  // }
  const newData = new Uint8Array(idealLength)
  newData.set(new Uint8Array(data))

  if (connectionType === DeviceConnectionType.USB) {
    hidLogger.debug('sendFeatureReport', reportId, data, newData)
    await device.sendFeatureReport(reportId, newData)
  }
  else if (connectionType === DeviceConnectionType.Bluetooth) {
    fillFeatureReportChecksum(reportId, newData)
    hidLogger.debug('sendFeatureReport', reportId, data, newData)
    await device.sendFeatureReport(reportId, newData)
  }
}

export async function receiveFeatureReport(item: DeviceItem, reportId: number): Promise<DataView> {
  const { device } = item
  const result = await device.receiveFeatureReport(reportId)
  hidLogger.debug('receiveFeatureReport', reportId, result)
  return result
}
