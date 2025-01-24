<script setup lang="ts">
import type { CustomPanelItem } from '@/device-based-router/shared';
import TextTag from './TextTag.vue';

defineProps<{
	item: CustomPanelItem
}>()
</script>

<template>
	<div class="dou-sc-container flex flex-col gap-y-1 self-start w-full">
		<div v-if="item.title" class="dou-sc-title mb-3 mt-2 ml-2">{{ typeof item.title === 'string' ? item.title : $t(item.title.key) }}
			<TextTag v-if="item.tag" class="text-xs align-middle">
				{{ typeof item.tag === 'string' ? item.tag : $t(item.tag.key) }}
			</TextTag>
		</div>
		<component :is="item.component" />
	</div>
</template>

<style scoped></style>
