<script setup lang="ts">
import type { ModalInfo } from './'
import { computed } from 'vue'
import Modal from './Modal.vue'

const props = defineProps<{
  modals: ModalInfo[]
}>()

defineEmits<{
  cancel: [modal: ModalInfo]
  confirm: [modal: ModalInfo]
}>()

const maskVisible = computed(() => props.modals.length > 0)
</script>

<template>
  <Teleport to="#teleport-container">
    <Transition name="fade">
      <div v-if="maskVisible" class="modal-mask" />
    </Transition>
    <TransitionGroup name="modal" tag="div" class="modal-transition-group">
      <Modal
        v-for="(modal) of modals" :key="modal._id" :info="modal" @cancel="$emit('cancel', modal)"
        @confirm="$emit('confirm', modal)"
      />
    </TransitionGroup>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-mask {
  @apply bg-black/60 w-full h-full duration-700;
  @apply fixed top-0 left-0 z-94 transform-gpu translate-z-202vh;
}

.modal-transition-group {
  --animation-function: cubic-bezier(0.24, 0.58, 0.3, 1.33);
  --animation-duration: 0.5s;
}

@keyframes horizontal-move {
  0% {
    transform: translateX(50%);
  }

  100% {
    transform: translateX(0);
  }
}

@keyframes model-move {
  0% {
    transform: translateY(calc(50vh + 100%)) scale(1.5) rotateZ(40deg);
  }

  100% {
    transform: translateY(0) scale(1) rotateZ(0);
  }
}

@media (prefers-reduced-motion: no-preference) {

  .modal-enter-active,
  .modal-leave-active {
    transition: opacity var(--animation-duration) linear;
  }

  .modal-enter-active {
    :deep(.horizontal) {
      animation: horizontal-move var(--animation-duration) ease forwards;
    }

    :deep(.common-modal-modal) {
      animation: model-move var(--animation-duration) var(--animation-function) forwards;
    }
  }

  .modal-leave-active {
    :deep(.horizontal) {
      animation: horizontal-move var(--animation-duration) ease reverse forwards;
    }

    :deep(.common-modal-modal) {
      animation: model-move var(--animation-duration) var(--animation-function) reverse forwards;
    }
  }

  .modal-enter-from,
  .modal-leave-to {
    @apply opacity-99;
  }
}
</style>
