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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function setBindingFields(config, tableName, bindingName, fields) {
  const tablePattern = new RegExp(
    `(\\[\\[${escapeRegExp(tableName)}\\]\\][\\s\\S]*?)(?=\\r?\\n\\[|$)`,
  )
  const newline = config.includes('\r\n') ? '\r\n' : '\n'
  let updated = false

  const nextConfig = config.replace(tablePattern, (block) => {
    const bindingPattern = new RegExp(
      `^([ \\t]*binding[ \\t]*=[ \\t]*"${escapeRegExp(bindingName)}"[ \\t]*)$`,
      'm',
    )
    if (!bindingPattern.test(block)) return block

    let normalizedBlock = block
    for (const key of Object.keys(fields)) {
      normalizedBlock = normalizedBlock.replace(
        new RegExp(`^[ \\t]*${escapeRegExp(key)}[ \\t]*=.*(?:\\r?\\n|$)`, 'gm'),
        '',
      )
    }

    const fieldLines = Object.entries(fields)
      .map(([key, value]) => `${key} = "${value}"`)
      .join(newline)
    updated = true
    return normalizedBlock.replace(bindingPattern, `$1${newline}${fieldLines}`)
  })

  if (!updated) {
    throw new Error(`Missing ${tableName} binding: ${bindingName}`)
  }

  return nextConfig
}

let config = readFileSync(sourcePath, 'utf8')
config = config.replace(/^name\s*=\s*"[^"]+"/m, `name = "${workerName}"`)
config = config.replace(/service\s*=\s*"[^"]+"/, `service = "${workerName}"`)
config = setBindingFields(config, 'd1_databases', 'DB', {
  database_name: databaseName,
  database_id: databaseId,
})
config = setBindingFields(config, 'r2_buckets', 'IMAGES', {
  bucket_name: bucketName,
})
config = config.replace(
  /NEXT_PUBLIC_SITE_URL\s*=\s*"[^"]+"/,
  `NEXT_PUBLIC_SITE_URL = "${siteUrl}"`,
)

writeFileSync(outputPath, config)
console.log(`Generated ${outputPath}`)
