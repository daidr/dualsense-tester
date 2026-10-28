import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { createI18n } from 'vue-i18n'
import { DeviceConnectionType } from '@/device-based-router/shared'
import deDE from '@/locales/de-DE.json'
import enUS from '@/locales/en-US.json'
import zhCN from '@/locales/zh-CN.json'
import FactoryInfo from '@/router/DualSense/views/_ConnectPanel/FactoryInfo.vue'
import { getSerialNumber } from '@/utils/dualsense/ds.util'

vi.mock('@/utils/logger.util', () => ({
  hidLogger: { debug: vi.fn() },
}))

vi.mock('floating-vue', () => ({
  Tooltip: { template: '<span><slot /></span>' },
}))

vi.mock('@/utils/dualsense/ds.util', () => ({
  formatDspVersion: () => '',
  formatThreePartVersion: () => '',
  formatUpdateVersion: () => '',
  getAssemblePartsInfo: vi.fn(),
  getBatteryBarcode: vi.fn(),
  getBatteryVoltage: vi.fn(),
  getBdMacAddress: vi.fn(),
  getBtPatchInfo: vi.fn(),
  getPcbaId: vi.fn(),
  getPcbaIdFull: vi.fn(),
  getPcbaIdFullString: vi.fn(),
  getSerialNumber: vi.fn(),
  getTouchpadFwVersion: vi.fn(),
  getTouchpadId: vi.fn(),
  getUniqueId: vi.fn(),
  getVcmBarcode: vi.fn(() => ({ left: undefined, right: undefined })),
  type2TracabilityInfoRead: vi.fn(),
}))

async function readColor(serialNumber: string, locale = 'en-US') {
  // Match the null-padded serial report decoded by the real FactoryInfo component.
  const serialReport = new Uint8Array(32)
  serialReport.set(new TextEncoder().encode(serialNumber))
  vi.mocked(getSerialNumber).mockResolvedValue(new DataView(serialReport.buffer))

  const firmwareReport = new DataView(new ArrayBuffer(60))
  firmwareReport.setUint16(20, 2, true)
  firmwareReport.setUint32(24, 777, true)
  firmwareReport.setUint32(28, 65655, true)

  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en-US',
    missingWarn: false,
    fallbackWarn: false,
    messages: { 'en-US': enUS, 'zh-CN': zhCN, 'de-DE': deDE },
  })
  const wrapper = mount(FactoryInfo, {
    global: {
      plugins: [i18n],
      provide: {
        deviceItem: shallowRef({
          connectionType: DeviceConnectionType.USB,
          device: { receiveFeatureReport: vi.fn(async () => firmwareReport) },
        }),
      },
    },
  })

  try {
    await flushPromises()
    const colorLabel = i18n.global.t('connect_panel.factory_info.color')
    const colorRow = wrapper.findAll('.labeled-value')
      .find(row => row.element.firstElementChild?.textContent?.trim() === colorLabel)
    expect(colorRow, 'Factory Info should include a color row').toBeDefined()
    return colorRow!.element.lastElementChild!.textContent!.trim()
  }
  finally {
    wrapper.unmount()
  }
}

// Each row is an independent controller reported in the linked issue.
const confirmedSamples: [string, string, string][] = [
  // https://github.com/daidr/dualsense-tester/issues/180
  ['F65C1338F10541822', 'Techno Red', '泰克诺红'],
  // https://github.com/daidr/dualsense-tester/issues/233
  ['F65C1338F10524318', 'Techno Red', '泰克诺红'],
  // https://github.com/daidr/dualsense-tester/issues/174
  ['E54BZ529V10257055', 'Monster Hunter Wilds', '怪物猎人荒野'],
  // https://github.com/daidr/dualsense-tester/issues/213 (#214 repeats this serial).
  ['E54CZ529V10310775', 'Monster Hunter Wilds', '怪物猎人荒野'],
]

describe.each(['en-US', 'zh-CN', 'de-DE'])('Factory Info colors in %s', (locale) => {
  it.each(confirmedSamples)('recognizes the reported controller %s', async (serial, english, chinese) => {
    expect(await readColor(serial, locale)).toBe(locale === 'zh-CN' ? chinese : english)
  })
})

describe('Factory Info color boundaries', () => {
  it.each([
    ['F551014PF10324491', 'Midnight Black'],
    ['E44300TBG10928161', 'White'],
    ['V558ZCTGL10256116', 'Astro Bot Joyful'],
  ] as const)('preserves the existing code mapping for ambiguous report %s', async (serial, color) => {
    expect(await readColor(serial)).toBe(color)
  })

  it.each([
    'E556ZADK310288722', // #193 has only one independent ZA sample.
    'F65C1438F10524318', // Synthetic neighboring code 14 has no evidence.
    'E54BZ829V10257055', // Synthetic neighboring code Z8 has no evidence.
  ])('keeps unconfirmed code in %s unknown', async (serial) => {
    expect(await readColor(serial)).toBe('Unknown')
  })
})
