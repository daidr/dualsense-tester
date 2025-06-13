<script setup lang="tsx">
import type { DeviceItem } from '@/device-based-router/shared'

import { LayoutGroup, m } from 'motion-v'
import { computed, h, reactive, ref, shallowRef, watch } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { useConnectionType, useDevice, useInputReport } from '@/composables/useInjectValues'
import { useModal, useWarningModal } from '@/composables/useModal'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { useDualSenseStore } from '@/store/dualsense'
import { shellVariants } from '@/utils/common.util'
import { receiveFeatureReport, sendFeatureReport } from '@/utils/dualsense/ds.util'
import { track } from '@/utils/umami.util'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../_utils/offset.util'
import { DSEProfile, DSEProfileSwitchButton, DSEProfileSwitchButtonIndexMap, useSaveProfile } from './_Profile/profile'
import ProfilePageLayout from './_Profile/ProfilePageLayout.vue'
import ProfileRenameInput from './_Profile/ProfileRenameInput.vue'
import ProfileSwitchButton from './_Profile/ProfileSwitchButton.vue'

const device = useDevice()
const connectionType = useConnectionType()
const inputReport = useInputReport()
const dsStore = useDualSenseStore()
const offset = computed(() =>
  connectionType.value === DeviceConnectionType.USB ? inputReportOffsetUSB : inputReportOffsetBluetooth,
)

const { t } = useI18n()

function mapInputToOutput(i: number) {
  switch (i) {
    case 1:
      return DSEProfileSwitchButton.Triangle
    case 2:
      return DSEProfileSwitchButton.Square
    case 3:
      return DSEProfileSwitchButton.Cross
    case 4:
      return DSEProfileSwitchButton.Circle
    default:
      return DSEProfileSwitchButton.Triangle
  }
}

const currentActiveProfile = computed(() => {
  return mapInputToOutput(inputReport.value.getUint8(offset.value.activeProfile) >> 4)
})

async function getProfiles(deviceItem: DeviceItem) {
  const sortIndex: Record<number, number> = {
    112: 0,
    121: 1,
    118: 2,
    115: 3,
  }
  const profileCollector: Array<Array<DataView>> = []
  const startReportId = 112
  for (let i = 0; i < 4; i++) {
    profileCollector.push([])
    const dataClip1: DataView = await receiveFeatureReport(deviceItem, startReportId + i * 3)
    const dataClip2: DataView = await receiveFeatureReport(deviceItem, startReportId + i * 3 + 1)
    const dataClip3: DataView = await receiveFeatureReport(deviceItem, startReportId + i * 3 + 2)
    profileCollector[i].push(dataClip1, dataClip2, dataClip3)
  }
  return profileCollector.map(i => reactive(DSEProfile.fromData(i))).sort((a, b) => sortIndex[a.id] - sortIndex[b.id])
}

const profiles = shallowRef<DSEProfile[]>()

async function refreshProfiles() {
  profiles.value = await getProfiles(device.value)
}

watch(device, (newDevice) => {
  if (newDevice) {
    refreshProfiles()
  }
}, { immediate: true })

function getProfileName(profile: DSEProfile) {
  if (!profile.assigned) {
    return t('profile_panel.unassigned')
  }
  if (profile.default) {
    return t('profile_panel.default')
  }
  return profile.label
}

const currentEditingProfileId = ref<number | null>(null)
const currentEditingProfile = computed(() => {
  void currentEditingProfileId.value
  void profiles.value
  if (currentEditingProfileId.value === null) {
    return null
  }
  return profiles.value?.find(profile => profile.id === currentEditingProfileId.value) || null
})

const { open: openWarningModal } = useWarningModal()
const { open: openModal } = useModal()
const { save: saveProfile } = useSaveProfile()

function handleCreate(profile: DSEProfile) {
  track('profile.create.click')
  const isConfirmHidden = ref(true)
  const innerLabel = ref(t('profile_panel.new_profile'))
  openModal({
    icon: 'i-mingcute-textbox-fill',
    title: t('profile_panel.create_profile'),
    hideConfirm: isConfirmHidden,
    content: () => h(ProfileRenameInput, {
      'modelValue': innerLabel.value,
      'onUpdate:modelValue': (value: string) => {
        innerLabel.value = value
      },
      'onValidChanged': (valid: boolean) => {
        isConfirmHidden.value = !valid
      },
    }),
    async onConfirm() {
      track('profile.create.confirm')
      const { id, switchButton } = profile
      const newProfile = new DSEProfile({
        id,
        switchButton,
        uniqueId: new Uint8Array(16).map(() => Math.floor(Math.random() * 256)),
        label: innerLabel.value,
      })
      saveProfile(newProfile).then(() => {
        refreshProfiles()
      })
    },
    onCancel() {
      track('profile.create.cancel')
    },
  })
}

function handleRename(profile: DSEProfile) {
  track('profile.rename.click')
  const isConfirmHidden = ref(true)
  const clonedProfile = profile.clone()
  const innerLabel = ref(clonedProfile.label)
  openModal({
    icon: 'i-mingcute-textbox-fill',
    title: t('shared.rename'),
    hideConfirm: isConfirmHidden,
    content: () => h(ProfileRenameInput, {
      'modelValue': innerLabel.value,
      'onUpdate:modelValue': (value: string) => {
        innerLabel.value = value
      },
      'onValidChanged': (valid: boolean) => {
        isConfirmHidden.value = !valid
      },
    }),
    async onConfirm() {
      track('profile.rename.confirm')
      clonedProfile.label = innerLabel.value
      await saveProfile(clonedProfile)
      refreshProfiles()
    },
    onCancel() {
      track('profile.rename.cancel')
    },
  })
}

function handleRemove(profile: DSEProfile) {
  track('profile.remove.click')
  const profileIndex = DSEProfileSwitchButtonIndexMap[profile.switchButton]
  openWarningModal({
    content: (
      <div class="text-base font-normal">
        <I18nT keypath="profile_panel.remove_confirm_tips" scope="global">
          {{
            name: () => <span class="rounded-lg bg-primary/10 px-2 py-0.5 text-sm text-primary">{profile.label}</span>,
          }}
        </I18nT>
      </div>
    ),
    async onConfirm() {
      track('profile.remove.confirm')
      await sendFeatureReport(device.value, 0x68, new Uint8Array([profileIndex]))
      refreshProfiles()
    },
    onCancel() {
      track('profile.remove.cancel')
    },
  })
}

function handleEdit(profile: DSEProfile) {
  track('profile.edit.click')
  dsStore.profileMode = true
  currentEditingProfileId.value = profile.id
}

function handleClose() {
  track('profile.edit.close')
  dsStore.profileMode = false
  currentEditingProfileId.value = null
}

function handleRefreshButtonClick() {
  track('profile.refresh.click')
  refreshProfiles()
}

// const { MagicTeleport } = useMagicTeleport('profileLayout')
</script>

<template>
  <m.div layout="position" class="flex flex-col gap-1">
    <div
      v-for="item of profiles" :key="item.id"
      v-tooltip.top-start="item.default ? $t('profile_panel.cannot_edit_default_profile_tips') : ''"
      class="profile-item" :class="{
        unassigned: !item.assigned,
      }"
    >
      <div class="w-1em flex-shrink-0">
        <m.div
          v-if="currentActiveProfile === item.switchButton" layout="position" layout-id="profile-widget-indicator"
          class="h-2 w-2 rounded-full bg-green-6"
        />
      </div>
      <ProfileSwitchButton :button="item.switchButton" />
      <div
        class="name flex-grow overflow-hidden text-ellipsis whitespace-nowrap" :title="getProfileName(item)"
        tabindex="0"
      >
        {{ getProfileName(item) }}
      </div>
      <div v-if="!dsStore.profileMode" class="flex flex-shrink-0">
        <template v-if="item.assigned && !item.default">
          <button
            v-tooltip.top="$t('shared.edit')" class="icon-button" :aria-label="$t('shared.edit')"
            @click="handleEdit(item)"
          >
            <div class="i-mingcute-edit-line" />
          </button>
          <button
            v-tooltip.top="$t('shared.rename')" class="icon-button" :aria-label="$t('shared.rename')"
            @click="handleRename(item)"
          >
            <div class="i-mingcute-textbox-line" />
          </button>
          <button
            v-tooltip.top="$t('shared.remove')" class="icon-button" :aria-label="$t('shared.remove')"
            @click="handleRemove(item)"
          >
            <div class="i-mingcute-delete-2-line" />
          </button>
        </template>
        <m.button
          v-else-if="!item.assigned" v-tooltip.top="$t('shared.create')" layout="position" class="icon-button"
          :aria-label="$t('shared.create')" @click="handleCreate(item)"
        >
          <div class="i-mingcute-add-line" />
        </m.button>
      </div>
    </div>

    <m.button v-if="!dsStore.profileMode" class="self-end dou-sc-btn" @click="handleRefreshButtonClick">
      {{ $t("shared.refresh") }}
    </m.button>
  </m.div>
  <Teleport to="#main-content" defer>
    <template v-if="dsStore.profileMode && currentEditingProfile">
      <LayoutGroup>
        <ProfilePageLayout
          :key="currentEditingProfile.id" :profile="currentEditingProfile"
          :active="currentActiveProfile === currentEditingProfile.switchButton" @close="handleClose"
          @refresh="refreshProfiles"
        />
      </LayoutGroup>
    </template>
  </Teleport>
</template>

<style scoped lang="scss">
.profile-item {
  @apply transition-colors;
  @apply flex items-center gap-2 justify-between px-1.5 py-1 rounded-md text-[var(--color)];
  @apply text-primary;

  &.unassigned {
    // @apply text-orange;
    @apply opacity-60;
  }

  .icon-button {
    @apply flex-shrink-0 p-1 cursor-pointer;

    &:hover {
      @apply bg-primary/15 rounded-md;
    }
  }
}
</style>
