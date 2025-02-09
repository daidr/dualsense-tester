/// <reference types="vite/client" />
/// <reference types="@types/w3c-web-hid" />
/// <reference types="vite-plugin-pwa/client" />

declare interface GitInfo {
  owner: string
  repo: string
  branch: string
  pr: string
  commitHash: string
  shortCommitHash: string
  commitMessage: string
  commitTimestamp: string
}

declare const __CROWDIN_PROGRESS__: Record<string, {
  locale: string
  translationProgress: number
  approvalProgress: number
}>

declare const __GIT_DEFINE__: GitInfo
