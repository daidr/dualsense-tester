import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import MicrophonePanel from '@/components/common/MicrophonePanel.vue'
import { DeviceConnectionType } from '@/device-based-router/shared'

const microphoneState = vi.hoisted(() => ({ current: undefined as any }))

vi.mock('motion-v', () => ({
  AnimatePresence: { template: '<div class="presence"><slot /></div>' },
  m: {
    div: { template: '<div class="spectrum-motion"><slot /></div>' },
  },
}))

vi.mock('@/components/base/DouButton.vue', () => ({
  default: { template: '<button type="button"><slot /></button>' },
}))

vi.mock('@/components/base/DouSelect.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/common/SpectrumView.vue', () => ({
  default: { template: '<div class="spectrum-view" />' },
}))

vi.mock('@/composables/useDualSenseMicrophone', () => ({
  useDualSenseMicrophone: () => microphoneState.current,
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ error: vi.fn() }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function createMicrophoneState() {
  return {
    inputDevices: shallowRef<MediaDeviceInfo[]>([]),
    selectedInputId: shallowRef<string | null>(null),
    isCapturing: shallowRef(false),
    isStarting: shallowRef(false),
    isRecording: shallowRef(false),
    isPlaying: shallowRef(false),
    isMuted: shallowRef(false),
    hasRecording: shallowRef(true),
    recordingDuration: shallowRef(5),
    playbackTime: shallowRef(0),
    error: shallowRef(null),
    analyser: shallowRef(null),
    refreshInputDevices: vi.fn(),
    hasNamedInputs: vi.fn(() => true),
    requestDeviceAccess: vi.fn(),
    startCapture: vi.fn(),
    stopCapture: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    playRecording: vi.fn(),
    pausePlayback: vi.fn(),
    clearRecording: vi.fn(),
  }
}

function mountPanel() {
  return mount(MicrophonePanel, {
    global: {
      provide: {
        deviceItem: shallowRef({ connectionType: DeviceConnectionType.USB }),
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  })
}

beforeEach(() => {
  microphoneState.current = createMicrophoneState()
})

describe('MicrophonePanel spectrum', () => {
  it('shows the final spectrum section only while listening or playing', async () => {
    const wrapper = mountPanel()

    expect(wrapper.find('.spectrum-view').exists()).toBe(false)

    microphoneState.current.isCapturing.value = true
    await nextTick()

    const panel = wrapper.find('.microphone-panel')
    expect(panel.find('.spectrum-view').exists()).toBe(true)
    expect(panel.element.lastElementChild?.querySelector('.spectrum-view')).not.toBeNull()

    microphoneState.current.isCapturing.value = false
    microphoneState.current.isPlaying.value = true
    await nextTick()
    expect(panel.find('.spectrum-view').exists()).toBe(true)

    microphoneState.current.isPlaying.value = false
    await nextTick()
    expect(panel.find('.spectrum-view').exists()).toBe(false)
  })
})
