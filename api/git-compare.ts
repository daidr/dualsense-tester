/* eslint-disable antfu/no-top-level-await */
import process from 'node:process'
import { getEnv } from '@vercel/functions'
import { createClient } from 'redis'

const redis = await createClient({ url: process.env.REDIS_URL }).connect()

const { VERCEL_GIT_REPO_OWNER = 'daidr', VERCEL_GIT_REPO_SLUG = 'dualsense-tester', VERCEL_GIT_COMMIT_REF = 'HEAD', VERCEL_ENV = 'development' } = getEnv()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const isDev = VERCEL_ENV === 'development'

class RuntimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuntimeError'
  }
}

async function compareCommits(base: string, head: string = VERCEL_GIT_COMMIT_REF) {
  if (!GITHUB_TOKEN) {
    throw new RuntimeError('Function is not available in the current environment')
  }

  let commitList: any

  const cacheKey = `compare:${head}`

  if (head !== 'HEAD') {
    // Check if the commit list is cached
    const cached = await redis.get(cacheKey)
    if (cached) {
      commitList = cached
    }
  }

  if (!commitList) {
    const query = `
    query($owner: String!, $name: String!, $head: String!) {
      repository(owner: $owner, name: $name) {
        object(expression: $head) {
          ... on Commit {
            history(first: 50) {
              edges {
                node {
                  authors(first: 10) {
                    totalCount
                    edges {
                      node {
                        name
                        avatarUrl(size: 32)
                      }
                    }
                  }
                  url
                  messageHeadline
                  committedDate
                  oid
                }
              }
            }
          }
        }
      }
    }
  `

    const variables = {
      owner: VERCEL_GIT_REPO_OWNER,
      name: VERCEL_GIT_REPO_SLUG,
      head,
    }

    const headers = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'UpdateLogger',
    }

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      console.error('failed to fetch data from GitHub GraphQL API', response.status, await response.text())
      throw new RuntimeError(`Failed to fetch data from GitHub GraphQL API: ${response.statusText}`)
    }

    const result = await response.json() as any

    if (result.errors) {
      console.error('GraphQL query failed: ', result.errors)
      throw new RuntimeError(`GraphQL query failed`)
    }

    commitList = result.data.repository.object.history.edges.map((edge: any) => ({
      id: edge.node.oid,
      time: edge.node.committedDate,
      message: edge.node.messageHeadline,
      url: edge.node.url,
      authors: edge.node.authors.edges.map((author: any) => ({
        name: author.node.name,
        avatarUrl: author.node.avatarUrl,
      })),
    }));

    (async () => {
      if (head !== 'HEAD') {
        const expiredIn = 60 * 60 * 6

        await redis.set(cacheKey, commitList, { expiration: { type: 'EX', value: expiredIn } })
      }
    })()
  }

  // Try to find the index of the base commit in commitList
  const baseIndex = commitList.findIndex((commit: any) => commit.id.startsWith(base))

  // If not found, return all data
  if (baseIndex === -1) {
    return {
      end: false,
      commits: commitList,
    }
  }

  // If base commit is found, return commits from base commit to the latest
  const commitsAfterBase = commitList.slice(0, baseIndex + 1)

  return {
    end: true,
    commits: commitsAfterBase,
  }
}

function isShortCommit(commit: string): boolean {
  // check if the id in hex
  if (!commit) {
    return false
  }
  if (typeof commit !== 'string') {
    return false
  }
  if (commit.length === 0) {
    return false
  }

  if (!/^[0-9a-f]{7,40}$/.test(commit)) {
    return false
  }

  return true
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const commit = url.searchParams.get('commit')
  let head = url.searchParams.get('head')

  if (head && !isDev) {
    return Response.json({ error: 'The "head" query parameter is only available in development mode.' }, { status: 400 })
  }
  if (!head) {
    head = VERCEL_GIT_COMMIT_REF
  }

  if (!commit) {
    return Response.json({ error: 'Missing "commit" query parameters.' }, { status: 400 })
  }

  const commitValid = isShortCommit(commit)

  if (!commitValid) {
    return Response.json({ error: 'Invalid "commit" query parameter. It should be a valid commit hash.' }, { status: 400 })
  }

  try {
    const comparison = await compareCommits(commit.trim(), head)
    return Response.json(comparison)
  }
  catch (error) {
    if (error instanceof RuntimeError) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    console.error('Unexpected error:', error)
    return Response.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
