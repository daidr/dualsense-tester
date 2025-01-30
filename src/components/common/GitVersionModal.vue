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
  <div v-if="pr || branch !== 'main'"
    class="px-2 py-1 rounded-24px text-sm bg-orange/20 ring-orange/50 ring-1 text-orange text-left mb-2">
    <div class="i-mingcute-warning-line inline-block align-middle mr-1"> </div>
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
    <a :href="commitUrl" target="_blank" v-if="commitHash" :title="commitHash">{{ shortCommitHash }}</a>
  </LabeledValue>
  <LabeledValue label="timestamp">
    {{ timeString }}
  </LabeledValue>
  <LabeledValue v-if="prUrl" label="PR">
    <a :href="prUrl" target="_blank" v-if="pr">{{ `#${pr}` }}</a>
  </LabeledValue>
  <div class="text-left dou-sc-autoborder rounded-2xl font-light mt-2 text-sm font-mono py-2 px-3">
    {{ commitMessage }}
  </div>
</template>

<style scoped lang="scss"></style>
