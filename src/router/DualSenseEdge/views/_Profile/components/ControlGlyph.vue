<script setup lang="ts">
// Renders a button as its fancy-controller icon when one exists, otherwise as a
// short text fallback (D-pad arrows, or the uppercase label for buttons with no
// icon such as Create / Options / PS / Touchpad / the back paddles).
defineProps<{
  icon?: string
  text?: string
}>()
</script>

<template>
  <i v-if="icon" class="glyph-icon" :class="icon" aria-hidden="true" />
  <span v-else class="glyph-text">{{ text }}</span>
</template>

<style scoped lang="scss">
.glyph-icon {
  // Size via font-size only so each icon keeps its intrinsic ratio (UnoCSS emits
  // height: 1em + a per-icon width); fixing width/height would squash wide glyphs.
  @apply inline-block;
  font-size: 1.4em;
}

.glyph-text {
  @apply inline-block leading-none;
}
</style>
