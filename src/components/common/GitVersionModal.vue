<script setup lang="tsx">
import { joinURL } from 'ufo'
import { useI18n } from 'vue-i18n'
import LabeledValue from './LabeledValue.vue'

const { t } = useI18n()

const {
  owner,
  repo,
  branch,
  pr,
  commitHash,
  shortCommitHash,
  commitMessage,
  commitTimestamp,
} = __GIT_DEFINE__
const PROVIDER = `https://github.com`
const repoUrl = joinURL(PROVIDER, owner, repo)
const branchUrl = joinURL(repoUrl, `tree`, branch)
const commitUrl = joinURL(repoUrl, `commit`, commitHash)
const prUrl = pr ? joinURL(repoUrl, `pull`, pr) : null
const date = new Date(commitTimestamp)

const timeString = date.toLocaleString()
</script>

<template>
  <div
    v-if="pr || branch !== 'main'"
    class="mb-2 rounded-24px bg-orange/20 px-2 py-1 text-start text-sm text-orange ring-1 ring-orange/50"
  >
    <div class="i-mingcute-warning-line me-1 inline-block align-middle" />
    <template v-if="pr">
      {{ t('git_version.warn_pr') }}
    </template>
    <template v-else-if="branch !== 'main'">
      {{ t('git_version.warn_dev') }}
    </template>
  </div>
  <LabeledValue label="repo">
    <a :href="repoUrl" target="_blank">{{ `${owner}/${repo}` }}</a>
  </LabeledValue>
  <LabeledValue label="branch">
    <a :href="branchUrl" target="_blank">{{ branch }}</a>
  </LabeledValue>
  <LabeledValue label="commit">
    <a v-if="commitHash" :href="commitUrl" target="_blank" :title="commitHash">{{ shortCommitHash }}</a>
  </LabeledValue>
  <LabeledValue label="timestamp">
    {{ timeString }}
  </LabeledValue>
  <LabeledValue v-if="prUrl" label="PR">
    <a v-if="pr" :href="prUrl" target="_blank">{{ `#${pr}` }}</a>
  </LabeledValue>
  <div class="mt-2 rounded-2xl px-3 py-2 text-start text-sm font-light font-mono dou-sc-autoborder">
    {{ commitMessage }}
  </div>
</template>

<style scoped lang="scss"></style>
