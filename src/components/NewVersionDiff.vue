<script setup lang="ts">
import { useTimeAgo } from '@/composables/useTimeAgo'
import { useUpgradeStore } from '@/store/upgrade'
import { gitDefine } from '@/utils/env.util'
import { joinURL } from 'ufo'
import { useI18n } from 'vue-i18n'

const { showUpgradeButton = false } = defineProps<{
  showUpgradeButton?: boolean
}>()

const upgradeStore = useUpgradeStore()
const { t } = useI18n()

function getCompareLink(gitInfo: GitInfo, oldGitInfo: GitInfo) {
  const { owner, repo, shortCommitHash: commitHash } = gitInfo
  const { shortCommitHash: oldCommitHash } = oldGitInfo
  const providerUrl = 'https://github.com'
  const repoUrl = joinURL(providerUrl, owner, repo)
  const compareUrl = joinURL(repoUrl, 'compare', `${oldCommitHash}...${commitHash}`)
  return compareUrl
}

function upgrade() {
  upgradeStore.updateServiceWorker(true)
  umami?.track('pwa_upgrade_tooltip', {
    action: 'confirm',
    version: gitDefine.shortCommitHash,
    new_version: upgradeStore.upgradeGitVersion?.shortCommitHash,
  })
}
</script>

<template>
  <div class="max-h-600px max-w-400px min-h-10px min-w-200px flex flex-col gap-2">
    <div v-if="upgradeStore.upgradeState === 'upgrading'"
      class="rounded-10px bg-blue/20 px-2 py-1 text-start text-sm text-blue-500 ring-1.5 ring-blue/50">
      {{
        t('pwa.upgrading') }}
    </div>
    <div v-if="upgradeStore.upgradeState === 'waiting'"
      class="rounded-10px bg-green/20 px-2 py-1 text-start text-sm text-green-600 ring-1.5 ring-green/50">
      {{
        t('pwa.update_available') }}
    </div>
    <div v-if="upgradeStore.upgradeGitVersion" class="flex items-center gap-2">
      <div class="flex flex-grow flex-col text-center">
        <div class="version-wrapper border-dashed">
          <p>{{ gitDefine.shortCommitHash }}</p>
          <p class="text-xs opacity-70" :title="new Date(gitDefine.commitTimestamp).toLocaleString()">
            {{ useTimeAgo(new Date(gitDefine.commitTimestamp)) }}
          </p>
        </div>
      </div>
      <div class="i-mingcute-arrow-right-line rtl-i-mingcute-arrow-left-line" />
      <div class="flex flex-grow flex-col text-center">
        <div class="version-wrapper new-version-wrapper">
          <p>{{ upgradeStore.upgradeGitVersion.shortCommitHash }}</p>
          <p class="text-xs opacity-70"
            :title="new Date(upgradeStore.upgradeGitVersion.commitTimestamp).toLocaleString()">
            {{ useTimeAgo(new Date(upgradeStore.upgradeGitVersion.commitTimestamp)) }}
          </p>
        </div>
      </div>
    </div>
    <div v-if="upgradeStore.upgradeGitVersion" class="changelog-wrapper">
      {{ upgradeStore.upgradeGitVersion.commitMessage }}
      <a :href="getCompareLink(upgradeStore.upgradeGitVersion, gitDefine)" target="_blank"
        class="inline-block v-middle">
        <div class="i-mingcute-external-link-line inline-block" />
      </a>
    </div>
    <div v-if="showUpgradeButton && upgradeStore.upgradeState === 'waiting'" class="flex justify-end">
      <button class="update-button" type="button" @click="upgrade">
        {{ $t('pwa.upgrade') }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
button {
  @apply px-2 py-0.5 text-primary rounded-10px text-center min-w-3rem;
  @apply transition;
  @apply ring-1.5;
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
}

.new-version-wrapper {
  @apply relative important-rounded-b-0 important-border-b-transparent;

  &::after,
  &::before {
    @apply absolute content-empty;
  }

  &::before {
    @apply bottom--1.2rem h-1.5rem -start-16.5px -end-1.5px;
    @apply bg-gradient-linear bg-gradient-from-gray-100 dark-bg-gradient-from-gray-900 bg-gradient-to-transparent bg-gradient-via-gray-100 dark-bg-gradient-via-gray-900;
    @apply dou-sc-autoborder border-t-none border-b-none border-1.5 border-s-none;
    -webkit-mask: radial-gradient(17px at top left, transparent 99%, black 100%) top left;
    mask: radial-gradient(17px at top left, transparent 99%, black 100%) top left;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;

    [dir=rtl] & {
      -webkit-mask: radial-gradient(17px at top right, transparent 99%, black 100%) top right;
      mask: radial-gradient(17px at top right, transparent 99%, black 100%) top right;
    }
  }

  &::after {
    @apply dou-sc-autoborder border-1.5;
    @apply border-t-none border-s-none;
    @apply rounded-e-10px rounded-bs-0;
    --size: calc(1rem + 5.5px);
    @apply h-[var(--size)] w-[var(--size)] transform -translate-y-50%;
    @apply top-100% -start-[var(--size)];
  }
}

.version-wrapper {
  @apply rounded-10px bg-gray-100 px-2 py-1 text-gray-600 dou-sc-autoborder border-1.5 dark-bg-gray-900 dark-text-gray-300;
}

.changelog-wrapper {
  @apply rounded-10px important-rounded-se-0 px-3 py-2 text-start text-sm font-light font-mono dou-sc-autoborder border-1.5;

  --gap: calc(50% + 0.5em);

  clip-path: polygon(
      /* 左上角开始 */
      0% 0%,
      /* 到右上角前的点 */
      var(--gap) 0%,
      /* 右上角后的点(扣掉区域的左下角) */
      var(--gap) 2px,
      /* 扣掉区域的右下角 */
      100% 2px,
      /* 右下角 */
      100% 100%,
      /* 左下角 */
      0% 100%);

  [dir=rtl] & {
    clip-path: polygon(
        /* 右上角开始 */
        100% 0%,
        /* 到左上角前的点 */
        calc(100% - var(--gap)) 0%,
        /* 左上角后的点(扣掉区域的右下角) */
        calc(100% - var(--gap)) 2px,
        /* 扣掉区域的左下角 */
        0% 2px,
        /* 左下角 */
        0% 100%,
        /* 右下角 */
        100% 100%);
  }
}
</style>
