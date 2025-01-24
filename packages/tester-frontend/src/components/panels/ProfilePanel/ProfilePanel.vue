<script setup lang="ts">

import TextTag from '@/components/common/TextTag.vue';
import { DualSenseType, type DeviceItem, type DSEProfileItem } from '@/dualsense/types';
import { getInputOffset, receiveFeatureReport } from '@/dualsense/utils';
import { useDualSenseStore } from '@/store/dualsense';
import { utf16LEDecoder } from '@/utils/decoder.util';
import { computedAsync } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const dualsenseStore = useDualSenseStore();
const { currentDevice, inputReport } = storeToRefs(dualsenseStore);
const { t } = useI18n();

const reverseIndexMap: Record<number, number> = {
    1: 0,
    2: 3,
    3: 2,
    4: 1
};

function mapInputToOutput(i: number) {
    return reverseIndexMap[i];
}

const currentActiveProfile = computed(() => {
    if (!inputReport.value || !currentDevice.value) {
        return undefined
    }
    const offset = getInputOffset(currentDevice.value.connectionType).activeProfile
    return mapInputToOutput(inputReport.value.getUint8(offset) >> 4)
})

function parseProfile(profileClips: DataView[]): DSEProfileItem | undefined {
    if (profileClips.length !== 3) {
        return undefined
    }
    const id = profileClips[0].getUint8(0)
    const unassigned = profileClips[0].getUint8(1) === 16;

    console.log('profileClips', profileClips, profileClips.map(i => i.byteLength))

    if (unassigned) {
        return {
            id,
            assigned: false,
        }
    } else {
        const nameBuffer = new Uint8Array(80);
        nameBuffer.set(new Uint8Array(profileClips[0].buffer, 6, 54), 0);
        nameBuffer.set(new Uint8Array(profileClips[1].buffer, 2, 26), 54);
        const decodedName = utf16LEDecoder.decode(nameBuffer).replace(/\0/g, '');
        return {
            id,
            assigned: true,
            default: id === 112,
            name: decodedName,
        }
    }
}

async function getProfiles(deviceItem: DeviceItem) {
    if (deviceItem.type !== DualSenseType.DualSenseEdge) {
        console.error('Only DualSense Edge is supported')
        return []
    }
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
    return profileCollector.map(parseProfile).filter(i => !!i).sort((a, b) => sortIndex[a.id] - sortIndex[b.id])
}

const profiles = computedAsync(() => {
    if (!currentDevice.value) {
        return []
    }
    return getProfiles(currentDevice.value)
})

function getProfileName(profile: DSEProfileItem) {
    if (!profile.assigned) {
        return t('profile_panel.unassigned')
    }
    if (profile.default) {
        return t('profile_panel.default')
    }
    return profile.name
}

function getProfileKey(profile: DSEProfileItem) {
    switch (profile.id) {
        case 112:
            return 'i-icon-park-twotone-handle-triangle';
        case 121:
            return 'i-icon-park-twotone-handle-round';
        case 118:
            return 'i-icon-park-twotone-handle-x';
        case 115:
            return 'i-icon-park-twotone-handle-square';
        default:
            return '';
    }
}
</script>

<template>
    <div class="dou-sc-container flex flex-col gap-y-1 self-start w-full">
        <div class="dou-sc-title mb-3 mt-2 ml-2">{{ $t("profile_panel.title") }} <TextTag class="text-xs align-middle">
                Beta
            </TextTag>
        </div>
        <div v-for="item, index of profiles" :key="item.id" class="profile-item" :class="{
            enterable: !item.default,
        }">
            <div class="w-1em flex-shrink-0">
                <div v-if="currentActiveProfile === index" class="w-2 h-2 bg-green-6 rounded-full"></div>
            </div>
            <div class="key-icon flex-shrink-0 flex items-center gap-1">
                <div class="text-xs font-mono bg-primary/30 font-bold px-1 rounded ring-current ring-1.5">
                    Fn</div>
                <span class="font-bold">+</span>
                <div class="text-xl" :class="getProfileKey(item)"></div>
            </div>
            <div class="name whitespace-nowrap overflow-hidden text-ellipsis flex-grow" :title="getProfileName(item)">
                {{ getProfileName(item) }}
            </div>
            <div class="w-1em flex-shrink-0">
                <div v-if="item.assigned && !item.default" class="i-mingcute-more-2-line"></div>
                <div v-else-if="!item.assigned" class="i-mingcute-add-line"></div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.profile-item {
    @apply transition-colors;
    @apply flex items-center gap-2 justify-between select-none px-1.5 py-1 rounded-md text-primary;

    &.enterable {
        @apply cursor-pointer;
        @apply hover:bg-black/10;
    }
}
</style>