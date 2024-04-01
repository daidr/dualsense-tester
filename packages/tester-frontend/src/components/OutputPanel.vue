<script setup lang="ts">
import { useDualSenseStore } from '@/store/dualsense';
import SwitchBox from './common/SwitchBox.vue';
import ColorInput from './common/ColorInput.vue';
import { hexToRgb, rgbToHex } from '@/utils/color.util';
import { computed } from 'vue';
import GroupedButton from './common/GroupedButton.vue';
import { useI18n } from 'vue-i18n';
import SelfResettingSlider from './common/SelfResettingSlider.vue';
import TriggerEffect from './TriggerEffect.vue';

const dualsenseStore = useDualSenseStore()
console.log(rgbToHex(dualsenseStore.output.lightbar))
const lightbarColor = computed({
    get: () => rgbToHex(dualsenseStore.output.lightbar),
    set: (value: string) => dualsenseStore.output.lightbar = hexToRgb(value)
})

const { t } = useI18n()

const playerLightSets = computed(() => {
    return [
        {
            value: 0,
            label: t('output_panel.player_led_off')
        },
        {
            value: 1,
            label: "1"
        },
        {
            value: 2,
            label: "2"
        },
        {
            value: 3,
            label: "3"
        },
        {
            value: 4,
            label: "4"
        },
        {
            value: 5,
            label: t('output_panel.player_led_all')
        }
    ]
})

const playerLightBrightnessSets = computed(() => {
    return [{
        value: 0,
        label: t('output_panel.player_led_brightness_high')
    }, {
        value: 1,
        label: t('output_panel.player_led_brightness_medium')
    }, {
        value: 2,
        label: t('output_panel.player_led_brightness_low')
    }]
})

</script>

<template>
    <div class="dou-sc-container space-y-2 self-start w-full">
        <table>
            <tr>
                <td class="label">{{ $t('output_panel.mic_mute_led') }}</td>
                <td class="value">
                    <div>
                        <SwitchBox v-model="dualsenseStore.output.micLight" />
                    </div>
                </td>
            </tr>
            <tr>
                <td class="label">{{ $t('output_panel.lightbar_color') }}</td>
                <td class="value">
                    <div>
                        <ColorInput v-model="lightbarColor" />
                    </div>
                </td>
            </tr>
            <tr>
                <td class="label">{{ $t('output_panel.player_led') }}</td>
                <td class="value">
                    <div>
                        <GroupedButton v-model="dualsenseStore.output.playerLight" :sets="playerLightSets" />
                    </div>
                </td>
            </tr>
            <tr>
                <td class="label">{{ $t('output_panel.player_led_brightness') }}</td>
                <td class="value">
                    <div>
                        <GroupedButton v-model="dualsenseStore.output.playerLightBrightness"
                            :sets="playerLightBrightnessSets" />
                    </div>
                </td>
            </tr>
            <tr>
                <td class="label">{{ $t('output_panel.rumble_heavy') }}</td>
                <td class="value">
                    <div>
                        <SelfResettingSlider class="w-full" :min="0" :max="255"
                            v-model="dualsenseStore.output.motorLeft" />
                    </div>
                </td>
            </tr>
            <tr>
                <td class="label">{{ $t('output_panel.rumble_soft') }}</td>
                <td class="value">
                    <div>
                        <SelfResettingSlider class="w-full" :min="0" :max="255"
                            v-model="dualsenseStore.output.motorRight" />
                    </div>
                </td>
            </tr>
            <TriggerEffect is="left" />
            <TriggerEffect is="right" />
        </table>
    </div>
</template>

<style scoped lang="scss">
table {
    @apply w-full;


}

.label,
:deep(.label) {
    @apply text-primary/70 font-bold whitespace-pre-wrap;
}

.value,
:deep(.value) {
    @apply max-w-50% pl-2;

    &>div {
        @apply flex items-center justify-end;
    }
}
</style>
