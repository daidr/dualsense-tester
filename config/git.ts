import process from 'node:process'
import { simpleGit } from 'simple-git'

function pickUpObject(obj: Record<string, any>, prefix: string) {
  const picked: Record<string, string> = {}
  for (const key in obj) {
    if (key.startsWith(prefix)) {
      picked[key] = obj[key]
    }
  }
  return picked
}

export async function gitDefine() {
  console.log('vercel ENVs:', pickUpObject(process.env, 'VERCEL_'))
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
