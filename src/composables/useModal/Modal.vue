<script setup lang="ts">
import type { ModalInfo } from '.'
import { isRef, type MaybeRef, type VNode } from 'vue'

defineProps<{
  info: ModalInfo
}>()

defineEmits(['cancel', 'confirm'])

defineSlots<{
  default: void
}>()

function refToVNode(ref: MaybeRef<string> | VNode) {
  if (isRef(ref)) {
    return () => ref.value
  }
  else if (typeof ref === 'string') {
    return () => ref
  }
  else {
    return ref
  }
}
</script>

<template>
  <div class="common-modal">
    <div class="common-modal-wrapper">
      <div class="horizontal min-w-350px max-w-screen-lg">
        <div class="common-modal-modal flex flex-col gap-3">
          <div
            v-if="info.title"
            class="flex items-center self-start gap-1 rounded-full bg-primary/20 p-1 text-primary dark-bg-primary dark-text-white/70"
          >
            <div v-if="typeof info.icon === 'string'" class="text-xl" :class="[info.icon]" />
            <component :is="info.icon" v-else-if="info.icon" class="text-xl" />
            <span class="pr-1 font-extrabold">
              <component :is="refToVNode(info.title)" />
            </span>
          </div>
          <p v-if="info.content" class="whitespace-pre-wrap text-center text-xl font-bold">
            <component :is="refToVNode(info.content)" />
          </p>
          <div class="mt-5 flex justify-end gap-5">
            <button v-if="!info.hideCancel" class="dismiss-button" type="button" @click="$emit('cancel')">
              {{ info.cancelText || $t('shared.cancel') }}
            </button>
            <button v-if="!info.hideConfirm" class="update-button" type="button" @click="$emit('confirm')">
              {{ info.confirmText || $t('shared.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.common-modal {
  @apply z-95 transform-gpu translate-z-203vh fixed top-0 left-0 right-0 bottom-0 select-none;

  .common-modal-wrapper {
    @apply fixed top-0 left-0 right-0 bottom-0 px-5;
    @apply flex justify-center items-center;
  }

  .common-modal-modal {
    @apply bg-light-4 dark-bg-dark-8 rounded-6 p-5;
    @apply ring-light-8 ring-1 dark-ring-dark-2;
    @apply shadow-xl shadow-black/10;
  }

  button {
    @apply px-3 py-1 text-primary rounded-full text-center min-w-4rem;
    @apply transition;
    @apply ring-2;
    @apply transform-gpu;

    &.update-button {
      @apply bg-transparent ring-primary/20 dark-ring-primary/50;

      &:hover,
      &:active {
        @apply ring-primary bg-primary text-white;
      }

      &:active {
        @apply scale-90;
      }
    }

    &.dismiss-button {
      @apply text-gray dark-text-gray-5;
      @apply ring-transparent;

      &:hover,
      &:active {
        @apply text-gray-6 dark-text-gray-4;
        @apply ring-gray-2 dark-ring-dark-50;
      }

      &:active {
        @apply scale-90;
      }
    }
  }
}
</style>
