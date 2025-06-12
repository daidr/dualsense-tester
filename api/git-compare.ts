import process from 'node:process'
import { getEnv } from '@vercel/functions'

const { VERCEL_GIT_REPO_OWNER = 'daidr', VERCEL_GIT_REPO_SLUG = 'dualsense-tester', VERCEL_GIT_COMMIT_REF = 'HEAD' } = getEnv()
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

console.log('process.env', process.env)

class RuntimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuntimeError'
  }
}

async function compareCommits(base: string) {
  if (!GITHUB_TOKEN) {
    throw new RuntimeError('Function is not available in the current environment')
  }

  const query = `
    query CompareCommits($owner: String!, $repo: String!, $base: String!, $head: String!, $limit: Int = 20) {
      repository(owner: $owner, name: $repo) {
        compare(baseRef: $base, headRef: $head) {
          commits(first: $limit) {
            nodes {
              author {
                name
                email
                date
                user {
                  login
                }
              }
              message
              oid
              commitUrl
              committedDate
              authoredDate
            }
            totalCount
          }
          status
          aheadBy
          behindBy
        }
      }
    }
  `

  const variables = {
    owner: VERCEL_GIT_REPO_OWNER,
    repo: VERCEL_GIT_REPO_SLUG,
    base,
    head: VERCEL_GIT_COMMIT_REF,
    limit: 20,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'UpdateLogger',
    'Authorization': `bearer ${GITHUB_TOKEN}`,
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.log('failed to fetch data from GitHub GraphQL API', response.status, errorText)
    throw new RuntimeError(`Failed to fetch data from GitHub GraphQL API: ${response.statusText}. Details: ${errorText}`)
  }

  const result = await response.json()

  return result

  if (result.errors) {
    console.error('GitHub GraphQL API errors:', result.errors)
    throw new RuntimeError(`GitHub GraphQL API returned errors: ${JSON.stringify(result.errors)}`)
  }

  const comparison = result.data?.repository?.compare
  if (!comparison) {
    throw new RuntimeError('Could not find comparison data in GraphQL response.')
  }

  const commits = comparison.commits.nodes.map((commit: any) => ({
    sha: commit.oid,
    commit: {
      author: {
        name: commit.author?.name,
        email: commit.author?.email,
        date: commit.authoredDate, // Prefer authoredDate for commit time
      },
      message: commit.message,
    },
    html_url: commit.commitUrl,
    author: commit.author?.user ? { login: commit.author.user.login } : null,
  }))

  return {
    status: comparison.status,
    ahead_by: comparison.aheadBy,
    behind_by: comparison.behindBy,
    total_commits: comparison.commits.totalCount,
    commits,
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const commit = url.searchParams.get('commit')

  if (!commit) {
    return Response.json({ error: 'Missing "commit" query parameters.' }, { status: 400 })
  }

  try {
    const comparison = await compareCommits(commit)
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
