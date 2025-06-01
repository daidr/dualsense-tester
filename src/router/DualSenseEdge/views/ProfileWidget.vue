<script setup lang="ts">
import type { DeviceItem } from '@/device-based-router/shared'
import { computedAsync } from '@vueuse/core'
import { computed, provide, reactive, ref, shallowReactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionType, useDevice, useInputReport } from '@/composables/useInjectValues'
import { useMagicTeleport } from '@/composables/useMagicTeleport'
import { DeviceConnectionType } from '@/device-based-router/shared'
import { useDualSenseStore } from '@/store/dualsense'
import { receiveFeatureReport } from '@/utils/dualsense/ds.util'
import { isDev } from '@/utils/env.util'
import { inputReportOffsetBluetooth, inputReportOffsetUSB } from '../_utils/offset.util'
import { DSEProfile, DSEProfileSwitchButton } from './_Profile/profile'
import ProfilePageLayout from './_Profile/ProfilePageLayout.vue'
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
  return profileCollector.map(i => reactive(new DSEProfile(i))).sort((a, b) => sortIndex[a.id] - sortIndex[b.id])
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

const currentEditingProfile = ref<DSEProfile | null>(null)

function handleRename(profile: DSEProfile) {

}

function handleRemove(profile: DSEProfile) {
}

function handleEdit(profile: DSEProfile) {
  dsStore.profileMode = true
  currentEditingProfile.value = profile
}

function handleCreate(profile: DSEProfile) {
}

function handleClose() {
  dsStore.profileMode = false
  currentEditingProfile.value = null
}

// const { MagicTeleport } = useMagicTeleport('profileLayout')
</script>

<template>
  <div v-for="item of profiles" :key="item.id"
    v-tooltip.top-start="item.default ? $t('profile_panel.cannot_edit_default_profile_tips') : ''" class="profile-item"
    :class="{
      unassigned: !item.assigned,
    }">
    <div class="w-1em flex-shrink-0">
      <div v-if="currentActiveProfile === item.switchButton" class="h-2 w-2 rounded-full bg-green-6" />
    </div>
    <ProfileSwitchButton :button="item.switchButton" />
    <div class="name flex-grow overflow-hidden text-ellipsis whitespace-nowrap" :title="getProfileName(item)"
      tabindex="0">
      {{ getProfileName(item) }}
    </div>
    <div class="flex flex-shrink-0">
      <template v-if="item.assigned && !item.default">
        <button v-tooltip.top="$t('profile_panel.edit')" class="icon-button" :aria-label="$t('profile_panel.edit')"
          @click="handleEdit(item)">
          <div class="i-mingcute-edit-line" />
        </button>
        <button v-tooltip.top="$t('profile_panel.rename')" class="icon-button" :aria-label="$t('profile_panel.rename')"
          @click="handleRename(item)">
          <div class="i-mingcute-textbox-line" />
        </button>
        <button v-tooltip.top="$t('profile_panel.remove')" class="icon-button" :aria-label="$t('profile_panel.remove')"
          @click="handleRemove(item)">
          <div class="i-mingcute-delete-2-line" />
        </button>
      </template>
      <button v-else-if="!item.assigned" v-tooltip.top="$t('profile_panel.create')" class="icon-button"
        :aria-label="$t('profile_panel.create')" @click="handleCreate(item)">
        <div class="i-mingcute-add-line" />
      </button>
    </div>
  </div>
  <button v-if="isDev" class="dou-sc-btn" @click="refreshProfiles">
    refresh (dev only)
  </button>

  <Teleport to="#main-content" defer>
    <template v-if="dsStore.profileMode && currentEditingProfile">
      <ProfilePageLayout :key="currentEditingProfile.id" :profile="currentEditingProfile"
        :active="currentActiveProfile === currentEditingProfile.switchButton" @close="handleClose" />
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
