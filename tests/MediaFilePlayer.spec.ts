import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, shallowRef } from 'vue'
import MediaFilePlayer from '@/components/common/MediaFilePlayer.vue'
import { DeviceConnectionType } from '@/device-based-router/shared'

const playerState = vi.hoisted(() => ({ current: undefined as any }))
const feedback = vi.hoisted(() => ({
  openWarningModal: vi.fn(),
  showErrorToast: vi.fn(),
}))

vi.mock('@/components/base/DouSelect.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

vi.mock('@/components/base/DouSwitch.vue', () => ({
  default: { template: '<button type="button" />' },
}))

vi.mock('@/components/common/SliderBox.vue', () => ({
  default: { template: '<div><slot :value="0" /></div>' },
}))

vi.mock('@/components/common/SpectrumView.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/composables/useDualSensePlayer', () => ({
  useDualSensePlayer: () => playerState.current,
}))

vi.mock('@/composables/useBtAudioPlayer', () => ({
  useBtAudioPlayer: () => playerState.current,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ error: feedback.showErrorToast }),
}))

vi.mock('@/composables/useModal', () => ({
  useWarningModal: () => ({ open: feedback.openWarningModal }),
}))

vi.mock('@/utils/logger.util', () => ({
  uiLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const SlotStub = defineComponent({
  template: '<div><slot /></div>',
})

const DouSelectStub = defineComponent({
  emits: ['update:modelValue'],
  template: '<button type="button" @click="$emit(\'update:modelValue\', \'stereo-output\')"><slot /></button>',
})

function createFakePlayer() {
  return {
    fileName: shallowRef('test.wav'),
    hasClip: shallowRef(true),
    isPlaying: shallowRef(false),
    currentTime: shallowRef(0),
    duration: shallowRef(5),
    syncToPC: shallowRef(false),
    outputDevices: shallowRef<MediaDeviceInfo[]>([]),
    sinkId: shallowRef<string | null>(null),
    sinkLabel: shallowRef(''),
    outputPickerSupported: shallowRef(false),
    analyser: shallowRef(null),
    playbackError: shallowRef(null as null | string),
    hapticChannel: shallowRef<'left' | 'right' | 'both'>('both'),
    loadFile: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    refreshOutputDevices: vi.fn(),
    requestDeviceAccess: vi.fn(),
    hasNamedOutputs: vi.fn(() => false),
    setSinkDevice: vi.fn(),
    selectOutputDevice: vi.fn(),
    setHapticChannel: vi.fn(),
    dispose: vi.fn(),
  }
}

function mountPlayer(
  connectionType: DeviceConnectionType,
  props: { audioEnabled?: boolean, hapticEnabled?: boolean } = {},
) {
  return mount(MediaFilePlayer, {
    props: {
      audioEnabled: props.audioEnabled ?? false,
      hapticEnabled: props.hapticEnabled ?? true,
    },
    global: {
      provide: {
        deviceItem: shallowRef({ connectionType }),
      },
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        AnimatePresence: SlotStub,
        DouSelect: DouSelectStub,
        DouSwitch: SlotStub,
        PopoverContent: SlotStub,
        PopoverPortal: SlotStub,
        PopoverRoot: SlotStub,
        PopoverTrigger: SlotStub,
        SliderBox: SlotStub,
        SpectrumView: true,
      },
    },
  })
}

beforeEach(() => {
  playerState.current = createFakePlayer()
})

describe('MediaFilePlayer output controls', () => {
  it('shows output-device selection for USB haptics-only playback', () => {
    const wrapper = mountPlayer(DeviceConnectionType.USB)

    expect(wrapper.text()).toContain('audio_panel.output_device')
  })

  it('does not show sound-card selection for Bluetooth playback', () => {
    const wrapper = mountPlayer(DeviceConnectionType.Bluetooth)

    expect(wrapper.text()).not.toContain('audio_panel.output_device')
  })

  it('automatically selects the DualSense output after device access is granted', async () => {
    const player = createFakePlayer()
    player.requestDeviceAccess.mockImplementation(async () => {
      player.outputDevices.value = [{
        kind: 'audiooutput',
        deviceId: 'dualsense-output',
        label: 'DualSense Wireless Controller',
        groupId: 'dualsense',
        toJSON: () => ({}),
      } as MediaDeviceInfo]
      return true
    })
    playerState.current = player
    const wrapper = mountPlayer(DeviceConnectionType.USB)
    const grantButton = wrapper.findAll('button')
      .find(button => button.text().includes('audio_panel.list_devices'))

    await grantButton!.trigger('click')
    await flushPromises()

    expect(player.setSinkDevice).toHaveBeenCalledWith(
      'dualsense-output',
      'DualSense Wireless Controller',
    )
  })

  it('blocks a stereo output selected before haptics are enabled and shows a modal', async () => {
    const player = createFakePlayer()
    player.outputDevices.value = [{
      kind: 'audiooutput',
      deviceId: 'stereo-output',
      label: 'PC Speakers',
      groupId: 'speakers',
      toJSON: () => ({}),
    } as MediaDeviceInfo]
    player.hasNamedOutputs.mockReturnValue(true)
    player.setSinkDevice.mockImplementation(async () => {
      player.playbackError.value = 'quadraphonic-required'
      return false
    })
    playerState.current = player
    const wrapper = mountPlayer(DeviceConnectionType.USB, {
      audioEnabled: true,
      hapticEnabled: false,
    })

    await wrapper.find('.output-select button').trigger('click')
    await flushPromises()

    expect(player.setSinkDevice).toHaveBeenCalledWith('stereo-output')
    expect(player.sinkId.value).toBeNull()
    expect(feedback.openWarningModal).toHaveBeenCalledOnce()
    const modal = feedback.openWarningModal.mock.calls[0][0]
    expect(modal).toMatchObject({
      confirmText: 'shared.close',
      hideCancel: true,
    })
    expect(modal.content).toMatchObject({
      type: 'span',
      props: {
        class: 'block whitespace-pre-wrap text-left text-base font-normal',
      },
      children: 'audio_panel.error_quadraphonic_required',
    })
    expect(feedback.showErrorToast).not.toHaveBeenCalled()
  })

  it('keeps non-channel playback failures as toasts', async () => {
    const player = createFakePlayer()
    playerState.current = player
    mountPlayer(DeviceConnectionType.USB)

    player.playbackError.value = 'output-routing-failed'
    await flushPromises()

    expect(feedback.showErrorToast).toHaveBeenCalledWith({
      content: 'audio_panel.error_output_routing_failed',
      duration: 6000,
    })
    expect(feedback.openWarningModal).not.toHaveBeenCalled()
  })
})
