<script setup lang="ts">

</script>

<template>
  <footer>
    <div class="footer">
      <div class="left">
        © {{ new Date().getFullYear() }} Coded by <a
          href="http://im.daidr.me" target="_blank"
          class="dou-sc-link"
        >daidr</a> with ❤.
      </div>
      <div class="right" />
    </div>
  </footer>
</template>

<style scoped lang="scss">
footer {
    @apply select-none;
    @apply w-full px-2;

    .footer {
        @apply max-w-[var(--max-width)] w-full;
        @apply flex justify-between items-center mx-auto my-2;
        @apply dou-sc-container;
    }
}
</style>
