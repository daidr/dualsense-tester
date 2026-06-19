<script setup lang="ts">
import { Tooltip } from 'floating-vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DouNumberInput from '@/components/base/DouNumberInput.vue'
import { useToast } from '@/composables/useToast'
import { usePageStore } from '@/store/page'
import { normalizeCurvePoints, setCurvePoint } from '../../profile'

const props = defineProps<{
  curve: number[]
}>()

const emit = defineEmits<{
  updateCurve: [curve: number[]]
}>()

/**
 * 与曲线图共享的激活点序号(0/1/2 对应 point1/2/3)。聚焦/悬停某行时写回,
 * 让曲线图上对应的控制点同步高亮;曲线图上 hover/拖拽也会反向高亮此处的行。
 */
const activePoint = defineModel<number | null>('activePoint', { default: null })

const { t } = useI18n()
const toast = useToast()
// 复用与曲线图相同的运行时调色板,使行高亮与图上激活点同色
const { colorPalette } = storeToRefs(usePageStore())

// 粘贴时按空白或逗号切分(提到模块作用域避免每次调用重新编译)
const CURVE_SEPARATOR_RE = /[\s,]+/
// 复制/粘贴提示的自动消失时长(ms),与项目其他 toast 保持一致
const TOAST_DURATION = 3000

// 3 个可编辑控制点(point1/2/3),point0 为死区点由"死区"滑块控制,不在此编辑
const points = computed(() => {
  return [0, 1, 2].map((ordinal) => {
    const pointIndex = ordinal + 1
    return {
      ordinal,
      pointIndex,
      x: props.curve[pointIndex * 2],
      y: props.curve[pointIndex * 2 + 1],
      // X 受相邻点约束以保持单调不减
      xMin: props.curve[(pointIndex - 1) * 2] ?? 0,
      xMax: props.curve[(pointIndex + 1) * 2] ?? 255,
    }
  })
})

function updateX(pointIndex: number, x: number | undefined) {
  if (x == null || Number.isNaN(x)) {
    return
  }
  emit('updateCurve', setCurvePoint(props.curve, pointIndex, x, props.curve[pointIndex * 2 + 1]))
}

function updateY(pointIndex: number, y: number | undefined) {
  if (y == null || Number.isNaN(y)) {
    return
  }
  emit('updateCurve', setCurvePoint(props.curve, pointIndex, props.curve[pointIndex * 2], y))
}

function onRowBlur(e: FocusEvent, ordinal: number) {
  // 焦点仍停留在本行内(在两个输入框间切换)时不清除高亮
  const row = e.currentTarget as HTMLElement
  if (row.contains(e.relatedTarget as Node | null)) {
    return
  }
  if (activePoint.value === ordinal) {
    activePoint.value = null
  }
}

function onRowLeave(e: PointerEvent, ordinal: number) {
  // 鼠标移出但焦点仍在本行(正在键盘输入)时保留高亮
  const row = e.currentTarget as HTMLElement
  if (row.contains(document.activeElement)) {
    return
  }
  if (activePoint.value === ordinal) {
    activePoint.value = null
  }
}

async function copyCurve() {
  try {
    await navigator.clipboard.writeText(props.curve.join(', '))
    toast.success({ content: t('profile_mode.joystick_curve_points.copied'), duration: TOAST_DURATION })
  }
  catch {
    toast.error({ content: t('profile_mode.joystick_curve_points.copy_failed'), duration: TOAST_DURATION })
  }
}

async function pasteCurve() {
  let text: string
  try {
    text = await navigator.clipboard.readText()
  }
  catch {
    toast.error({ content: t('profile_mode.joystick_curve_points.paste_failed'), duration: TOAST_DURATION })
    return
  }
  const values = text.split(CURVE_SEPARATOR_RE).filter(Boolean).map(Number)
  const normalized = normalizeCurvePoints(values)
  if (!normalized) {
    toast.error({ content: t('profile_mode.joystick_curve_points.paste_invalid'), duration: TOAST_DURATION })
    return
  }
  emit('updateCurve', normalized)
  toast.success({ content: t('profile_mode.joystick_curve_points.pasted'), duration: TOAST_DURATION })
}
</script>

<template>
  <div class="editor">
    <div class="head">
      <span class="title">{{ $t('profile_mode.joystick_curve_points.label') }}</span>
      <div class="actions">
        <Tooltip :delay="0">
          <button type="button" class="action-btn" :aria-label="$t('profile_mode.joystick_curve_points.copy')" @click="copyCurve">
            <div class="i-mingcute-copy-2-line" />
          </button>
          <template #popper>
            {{ $t('profile_mode.joystick_curve_points.copy') }}
          </template>
        </Tooltip>
        <Tooltip :delay="0">
          <button type="button" class="action-btn" :aria-label="$t('profile_mode.joystick_curve_points.paste')" @click="pasteCurve">
            <div class="i-mingcute-clipboard-line" />
          </button>
          <template #popper>
            {{ $t('profile_mode.joystick_curve_points.paste') }}
          </template>
        </Tooltip>
      </div>
    </div>

    <div class="columns">
      <span class="badge-spacer" />
      <span class="col-label">{{ $t('profile_mode.joystick_curve_points.input') }}</span>
      <span class="col-label">{{ $t('profile_mode.joystick_curve_points.output') }}</span>
    </div>

    <div
      v-for="p in points" :key="p.ordinal" class="point-row" :class="{ active: activePoint === p.ordinal }"
      @pointerenter="activePoint = p.ordinal" @pointerleave="onRowLeave($event, p.ordinal)"
      @focusin="activePoint = p.ordinal" @focusout="onRowBlur($event, p.ordinal)"
    >
      <span
        class="badge"
        :style="activePoint === p.ordinal ? { backgroundColor: colorPalette.active, color: '#fff' } : undefined"
      >{{ p.ordinal + 1 }}</span>
      <DouNumberInput
        :model-value="p.x" :min="p.xMin" :max="p.xMax"
        @update:model-value="updateX(p.pointIndex, $event)"
      />
      <DouNumberInput
        :model-value="p.y" :min="0" :max="255"
        @update:model-value="updateY(p.pointIndex, $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor {
  @apply flex flex-col gap-2 w-full;
}

.head {
  @apply flex items-center justify-between gap-2;

  .title {
    @apply text-sm text-primary font-bold select-none;
  }

  .actions {
    @apply flex items-center gap-1;
  }

  .action-btn {
    @apply flex items-center justify-center w-8 h-8 rounded-full text-primary dou-sc-colorborder;
    @apply transition-colors hover:bg-stone-100 dark:hover:bg-stone-900;
  }
}

.columns {
  @apply grid items-center gap-2;
  // minmax(0, 1fr) 允许轨道收缩到内容宽度以下,避免输入框固定宽撑出溢出
  grid-template-columns: 1.5rem minmax(0, 1fr) minmax(0, 1fr);

  .badge-spacer {
    @apply w-6;
  }

  .col-label {
    @apply text-xs text-primary opacity-70 text-center select-none;
  }
}

.point-row {
  @apply grid items-center gap-2 rounded-xl px-1 py-1 transition-colors;
  grid-template-columns: 1.5rem minmax(0, 1fr) minmax(0, 1fr);

  &.active {
    @apply bg-stone-100 dark:bg-stone-900;
  }

  .badge {
    @apply flex items-center justify-center w-6 h-6 rounded-full text-xs tabular-nums select-none;
    @apply bg-primary/15 text-primary transition-colors;
  }

  // 让数值输入框填满单元格并可伸缩(覆盖共享组件里输入框的固定宽 w-20)
  :deep(.number-input-wrapper) {
    @apply w-full;
  }

  :deep(.number-input) {
    @apply w-auto min-w-0 flex-1;
  }
}
</style>
