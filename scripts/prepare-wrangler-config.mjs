import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const repoRoot = resolve(import.meta.dirname, '..')
const sourcePath = resolve(repoRoot, process.argv[2] ?? 'wrangler.toml')
const outputPath = resolve(repoRoot, process.argv[3] ?? 'wrangler.ci.toml')

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  if (/["\r\n]/.test(value)) throw new Error(`Invalid value for environment variable: ${name}`)
  return value
}

const workerName = process.env.CF_WORKER_NAME?.trim() || 'qiaomu-blog-opensource'
const databaseId = required('CF_D1_DATABASE_ID')
const databaseName = process.env.CF_D1_DATABASE_NAME?.trim() || 'qiaomu-blog-db'
const bucketName = required('CF_R2_BUCKET_NAME')
const siteUrl = required('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '')

if (!/^https:\/\//.test(siteUrl)) {
  throw new Error('NEXT_PUBLIC_SITE_URL must start with https://')
}

let config = readFileSync(sourcePath, 'utf8')
config = config.replace(/^name\s*=\s*"[^"]+"/m, `name = "${workerName}"`)
config = config.replace(/service\s*=\s*"[^"]+"/, `service = "${workerName}"`)
config = config.replace(
  /(\[\[d1_databases\]\]\s*\r?\n\s*binding\s*=\s*"DB")/,
  `$1\ndatabase_name = "${databaseName}"\ndatabase_id = "${databaseId}"`,
)
config = config.replace(
  /(\[\[r2_buckets\]\]\s*\r?\n\s*binding\s*=\s*"IMAGES")/,
  `$1\nbucket_name = "${bucketName}"`,
)
config = config.replace(
  /NEXT_PUBLIC_SITE_URL\s*=\s*"[^"]+"/,
  `NEXT_PUBLIC_SITE_URL = "${siteUrl}"`,
)

writeFileSync(outputPath, config)
console.log(`Generated ${outputPath}`)
