import { describe, expect, it, vi } from 'vitest'
import DualSenseRouter from '@/router/DualSense'
import DualSenseEdgeRouter from '@/router/DualSenseEdge'

vi.mock('@/utils/env.util', () => ({
  gitDefine: {},
  isDev: false,
}))

describe.each([
  ['DualSense', new DualSenseRouter()],
  ['DualSense Edge', new DualSenseEdgeRouter()],
])('%s audio panel registration', (_name, router) => {
  it('uses the existing title toggle for audio and microphone views', () => {
    const panel = router.widgetPanels!({} as never)![1]!

    expect(panel.component).toBeUndefined()
    expect(panel.tabs?.map(tab => tab.title)).toEqual([
      { key: 'audio_panel.title' },
      { key: 'microphone_panel.title' },
    ])
    expect(panel.tabs?.every(tab => Boolean(tab.component))).toBe(true)
  })
})
