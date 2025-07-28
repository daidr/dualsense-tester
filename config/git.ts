import process from 'node:process'
import { simpleGit } from 'simple-git'

export async function gitDefine() {
  const git = simpleGit()
  const owner = process.env.VERCEL_GIT_REPO_OWNER || 'daidr'
  const repo = process.env.VERCEL_GIT_REPO_SLUG || 'dualsense-tester'
  const branch = process.env.VERCEL_GIT_COMMIT_REF || 'main'
  const pr = process.env.VERCEL_GIT_PULL_REQUEST_ID || ''
  const commit = (await git.log({ n: 1 })).latest
  const commitHash = commit?.hash || ''
  const shortCommitHash = commit?.hash?.slice(0, 7) || ''
  const commitMessage = commit?.message || ''
  const commitTimestamp = commit?.date || ''

  return {
    __GIT_DEFINE__: JSON.stringify({
      owner,
      repo,
      branch,
      pr,
      commitHash,
      shortCommitHash,
      commitMessage,
      commitTimestamp,
    }),
  }
}
