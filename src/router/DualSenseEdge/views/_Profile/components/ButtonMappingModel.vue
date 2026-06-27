<script setup lang="ts">
import type { ControlLayout } from './buttonMappingLayout'
import { provide, ref, watch } from 'vue'
import DSEBody from '../../_ModelPanel/DSEBody.vue'
import { CONTROL_BODY_GROUP, CONTROL_LAYOUT, MAPPING_ACTIVE_KEY, STAGE } from './buttonMappingLayout'

defineSlots<{
  capsule: (props: { control: ControlLayout }) => any
}>()

const modelTransform = `translate(${STAGE.modelX}, ${STAGE.modelY})`

// The capsule currently hovered or being edited. Capsules write to it through the
// injected context; the matching connector line and body shape highlight in sync.
const activeId = ref<string | null>(null)
provide(MAPPING_ACTIVE_KEY, {
  activeId,
  setActive: (id: string | null) => { activeId.value = id },
})

// Body shapes live inside the embedded DSEBody component, so we toggle the
// highlight class imperatively by id rather than threading a prop through it.
const modelRef = ref<SVGGElement | null>(null)
let highlighted: Element | null = null
watch(activeId, (id) => {
  highlighted?.classList.remove('hl')
  highlighted = null
  if (!id || !modelRef.value) {
    return
  }
  const group = CONTROL_BODY_GROUP[id]
  if (!group) {
    return
  }
  const el = modelRef.value.querySelector(`#${group}`)
  if (el) {
    el.classList.add('hl')
    highlighted = el
  }
})

function polylinePoints(c: ControlLayout) {
  return c.points.map(p => `${p[0]},${p[1]}`).join(' ')
}

function capStyle(c: ControlLayout) {
  return {
    left: `${(c.cap[0] / STAGE.w) * 100}%`,
    top: `${(c.cap[1] / STAGE.h) * 100}%`,
  }
}
</script>

<template>
  <div class="stage">
    <svg class="scene" :viewBox="`0 0 ${STAGE.w} ${STAGE.h}`" preserveAspectRatio="xMidYMid meet">
      <g ref="modelRef" class="model" :transform="modelTransform">
        <DSEBody />
      </g>
      <g class="lines">
        <template v-for="c in CONTROL_LAYOUT" :key="c.id">
          <polyline :class="{ active: c.id === activeId }" :points="polylinePoints(c)" />
          <circle :class="{ active: c.id === activeId }" :cx="c.anchor[0]" :cy="c.anchor[1]" r="6" />
        </template>
      </g>
    </svg>
    <div class="caps">
      <div v-for="c in CONTROL_LAYOUT" :key="c.id" class="cap-slot" :style="capStyle(c)">
        <slot name="capsule" :control="c" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stage {
  @apply relative w-full mx-auto;
  @apply text-black/70 dark-text-white/70;
  max-width: 1080px;
  aspect-ratio: v-bind('`${STAGE.w} / ${STAGE.h}`');
  container-type: inline-size;
}

.scene {
  @apply absolute inset-0 w-full h-full;
}

// Render the embedded controller body as a faint outline rather than the solid
// fill it uses in the live tester.
.scene :deep(.ds-fill *) {
  fill: color-mix(in srgb, currentColor, transparent 92%);
  stroke: color-mix(in srgb, currentColor, transparent 55%);
  stroke-width: 1;
  transition: fill 0.12s ease, stroke 0.12s ease;
}

// Hide the trigger travel levers here only — DSEBody is shared with the live
// tester, where they must stay visible.
.scene :deep(#LTAdapter),
.scene :deep(#RTAdapter) {
  display: none;
}

// Co-highlight: the hovered/edited button shape turns primary in sync with its line.
.scene :deep(.hl),
.scene :deep(.hl *) {
  @apply fill-primary stroke-primary;
}

.scene .lines {
  polyline {
    @apply fill-none;
    stroke: color-mix(in srgb, currentColor, transparent 60%);
    stroke-width: 2.5;
    transition: stroke 0.12s ease;

    &.active {
      @apply stroke-primary;
      stroke-width: 3.5;
    }
  }

  circle {
    fill: color-mix(in srgb, currentColor, transparent 55%);
    transition: fill 0.12s ease;

    &.active {
      @apply fill-primary;
    }
  }
}

.caps {
  @apply absolute inset-0;
  // capsule text scales with the stage so the whole layout stays proportional
  font-size: clamp(11px, 1.6cqw, 19px);
  pointer-events: none;
}

.cap-slot {
  @apply absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
</style>
