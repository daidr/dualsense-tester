import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

function htmlPlugin(): Plugin {
  if (process.env.NODE_ENV === 'development') {
    return {
      name: 'html-transform',
    }
  }
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const buildEnv = process.env.BUILD_ENV
  const vercelEnv = process.env.VERCEL_ENV

  let ref = 'unknown'

  if (buildEnv === 'docker') {
    ref = 'docker'
  }
  else if (vercelEnv === 'production') {
    ref = 'saas'
  }

  const umamiTemplate = readFileSync(path.resolve(__dirname, './umami.html'), 'utf-8')

  const umamiScript = umamiTemplate.replace('%REF%', ref)

  let ga4Template = ''

  if (ref === 'saas') {
    ga4Template = readFileSync(path.resolve(__dirname, './ga4.html'), 'utf-8')
  }

  const finalScript = `${umamiScript}${ga4Template}`

  return {
    name: 'html-transform',
    transformIndexHtml(html) {
      return html.replace(
        /<!-- Analytics Placeholder -->/,
        finalScript,
      )
    },
  }
}

export default htmlPlugin
