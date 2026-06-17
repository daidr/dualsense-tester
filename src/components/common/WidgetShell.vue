<script setup lang="ts">
import type { CustomPanelItem, PanelTabItem } from '@/device-based-router/shared'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { shellVariants } from '@/utils/common.util'
import GeneralContainer from './GeneralContainer.vue'
import GroupedButton from './GroupedButton.vue'
import LoadingView from './LoadingView.vue'

const props = defineProps<{
  item: CustomPanelItem
}>()

const { t } = useI18n()

function resolveLabel(title: string | { key: string }): string {
  return typeof title === 'string' ? title : t(title.key)
}

const isTabbed = computed(() => !!props.item.tabs?.length)

const activeIndex = ref(0)

const tabSets = computed(() =>
  (props.item.tabs ?? []).map((tab, index) => ({
    value: index,
    label: resolveLabel(tab.title),
  })),
)

const activeTab = computed<PanelTabItem | undefined>(() =>
  props.item.tabs?.[activeIndex.value] ?? props.item.tabs?.[0],
)

const finalTitle = computed(() => {
  if (!props.item.title)
    return ''
  return resolveLabel(props.item.title)
})

const finalTag = computed(() => {
  if (!props.item.tag)
    return ''
  return resolveLabel(props.item.tag)
})

// 根据模式选择实际渲染的组件与布局：tab 模式取当前选中项，否则取面板自身组件。
const renderComponent = computed(() => isTabbed.value ? activeTab.value?.component : props.item.component)
const renderLayout = computed(() => isTabbed.value ? activeTab.value?.layout : props.item.layout)
</script>

<template>
  <GeneralContainer :title="isTabbed ? '' : finalTitle" :tag="isTabbed ? '' : finalTag">
    <template v-if="isTabbed" #title>
      <GroupedButton v-model="activeIndex" :sets="tabSets" size="md" />
    </template>

    <Suspense>
      <component :is="renderLayout" v-if="renderLayout">
        <component :is="renderComponent" :key="activeIndex" />
      </component>
      <component :is="renderComponent" v-else :key="activeIndex" />

      <template #fallback>
        <LoadingView
          layout="position" :h="150" class="w-full p-1 text-primary" :variants="shellVariants"
          initial="hidden" animate="visible" exit="hidden"
        />
      </template>
    </Suspense>
  </GeneralContainer>
</template>

<style scoped></style>
