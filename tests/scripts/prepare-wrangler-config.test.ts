import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = resolve(import.meta.dirname, '../..')
const scriptPath = resolve(projectRoot, 'scripts/prepare-wrangler-config.mjs')
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('prepare-wrangler-config', () => {
  it('injects deployment values without modifying the template', () => {
    const directory = mkdtempSync(join(tmpdir(), 'qiaomu-wrangler-'))
    temporaryDirectories.push(directory)
    const sourcePath = join(directory, 'wrangler.toml')
    const outputPath = join(directory, 'wrangler.ci.toml')
    const template = `name = "template-worker"
[[services]]
binding = "WORKER_SELF_REFERENCE"
service = "template-worker"
[[d1_databases]]
binding = "DB"
[[r2_buckets]]
binding = "IMAGES"
[vars]
NEXT_PUBLIC_SITE_URL = "https://your-domain.com"
`
    writeFileSync(sourcePath, template)

    execFileSync(process.execPath, [scriptPath, sourcePath, outputPath], {
      env: {
        ...process.env,
        CF_WORKER_NAME: 'my-blog',
        CF_D1_DATABASE_ID: 'database-id',
        CF_D1_DATABASE_NAME: 'my-blog-db',
        CF_R2_BUCKET_NAME: 'my-blog-images',
        NEXT_PUBLIC_SITE_URL: 'https://blog.example.org/',
      },
    })

    const generated = readFileSync(outputPath, 'utf8')
    expect(generated).toContain('name = "my-blog"')
    expect(generated).toContain('service = "my-blog"')
    expect(generated).toContain('database_name = "my-blog-db"')
    expect(generated).toContain('database_id = "database-id"')
    expect(generated).toContain('bucket_name = "my-blog-images"')
    expect(generated).toContain('NEXT_PUBLIC_SITE_URL = "https://blog.example.org"')
    expect(readFileSync(sourcePath, 'utf8')).toBe(template)
  })

  it('replaces existing binding values instead of creating duplicate TOML keys', () => {
    const directory = mkdtempSync(join(tmpdir(), 'qiaomu-wrangler-'))
    temporaryDirectories.push(directory)
    const sourcePath = join(directory, 'wrangler.toml')
    const outputPath = join(directory, 'wrangler.ci.toml')
    const template = `name = "template-worker"
[[services]]
binding = "WORKER_SELF_REFERENCE"
service = "template-worker"
[[d1_databases]]
binding = "DB"
database_name = "personal-db"
database_id = "personal-id"
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "personal-bucket"
[vars]
NEXT_PUBLIC_SITE_URL = "https://your-domain.com"
`
    writeFileSync(sourcePath, template)

    execFileSync(process.execPath, [scriptPath, sourcePath, outputPath], {
      env: {
        ...process.env,
        CF_WORKER_NAME: 'my-blog',
        CF_D1_DATABASE_ID: 'database-id',
        CF_D1_DATABASE_NAME: 'my-blog-db',
        CF_R2_BUCKET_NAME: 'my-blog-images',
        NEXT_PUBLIC_SITE_URL: 'https://blog.example.org',
      },
    })

    const generated = readFileSync(outputPath, 'utf8')
    expect(generated.match(/^database_name\s*=/gm)).toHaveLength(1)
    expect(generated.match(/^database_id\s*=/gm)).toHaveLength(1)
    expect(generated.match(/^bucket_name\s*=/gm)).toHaveLength(1)
    expect(generated).toContain('database_name = "my-blog-db"')
    expect(generated).toContain('database_id = "database-id"')
    expect(generated).toContain('bucket_name = "my-blog-images"')
    expect(generated).not.toContain('personal-')
  })
})
