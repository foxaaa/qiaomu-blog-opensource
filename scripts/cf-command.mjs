import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const repoRoot = resolve(import.meta.dirname, '..')
const cliPaths = {
  wrangler: resolve(repoRoot, 'node_modules/wrangler/bin/wrangler.js'),
  'opennextjs-cloudflare': resolve(repoRoot, 'node_modules/@opennextjs/cloudflare/dist/cli/index.js'),
}

function getConfigPath() {
  const configured = process.env.WRANGLER_CONFIG?.trim()
  if (configured) return resolve(repoRoot, configured)

  const localConfig = resolve(repoRoot, 'wrangler.local.toml')
  return existsSync(localConfig) ? localConfig : resolve(repoRoot, 'wrangler.toml')
}

function run([command, ...args]) {
  const cliPath = cliPaths[command]
  if (!cliPath || !existsSync(cliPath)) throw new Error(`Missing CLI dependency: ${command}`)

  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function validateConfig(configPath, { production }) {
  if (!existsSync(configPath)) throw new Error(`Wrangler config not found: ${configPath}`)

  const config = readFileSync(configPath, 'utf8')
  const required = [
    ['D1 section', /\[\[d1_databases\]\]/],
    ['D1 binding', /binding\s*=\s*"DB"/],
    ['R2 section', /\[\[r2_buckets\]\]/],
    ['R2 binding', /binding\s*=\s*"IMAGES"/],
    ['site URL', /NEXT_PUBLIC_SITE_URL\s*=\s*"https?:\/\/[^"\s]+"/],
  ]

  for (const [label, pattern] of required) {
    if (!pattern.test(config)) throw new Error(`Missing ${label} in ${configPath}`)
  }

  if (production) {
    const productionRequired = [
      ['D1 database ID', /database_id\s*=\s*"(?!REPLACE_)[^"\s]+"/],
      ['R2 bucket name', /bucket_name\s*=\s*"(?!REPLACE_)[^"\s]+"/],
    ]
    for (const [label, pattern] of productionRequired) {
      if (!pattern.test(config)) throw new Error(`Missing ${label} in ${configPath}`)
    }

    if (/NEXT_PUBLIC_SITE_URL\s*=\s*"https?:\/\/(?:your-domain\.com|example\.com|localhost)/.test(config)) {
      throw new Error(`NEXT_PUBLIC_SITE_URL is still a placeholder in ${configPath}`)
    }
  }
}

function applyDatabase(configPath, mode) {
  const remote = mode === 'remote'
  validateConfig(configPath, { production: remote })

  for (const [label, filename] of [
    ['D1 schema', 'db/schema.sql'],
    ['template defaults', 'db/seed-template.sql'],
  ]) {
    const filePath = resolve(repoRoot, filename)
    if (!existsSync(filePath)) continue
    console.log(`==> applying ${label} (${mode})`)
    run(['wrangler', 'd1', 'execute', 'DB', `--${mode}`, `--file=${filePath}`, '-c', configPath])
  }
}

function cleanBuildOutput() {
  for (const directory of ['.next', '.open-next']) {
    rmSync(resolve(repoRoot, directory), { recursive: true, force: true })
  }
}

function build(configPath) {
  validateConfig(configPath, { production: false })
  applyDatabase(configPath, 'local')
  cleanBuildOutput()
  console.log('==> building OpenNext worker')
  run(['opennextjs-cloudflare', 'build'])
}

function deploy(configPath) {
  if (!existsSync(resolve(repoRoot, '.open-next', 'worker.js'))) {
    throw new Error('Missing .open-next build output. Run npm run cf:build first.')
  }
  applyDatabase(configPath, 'remote')
  console.log('==> deploying Cloudflare worker')
  run(['opennextjs-cloudflare', 'deploy', '-c', configPath])
}

const command = process.argv[2] ?? 'release'
const configPath = getConfigPath()
console.log(`==> using wrangler config: ${configPath}`)

switch (command) {
  case 'build':
    build(configPath)
    break
  case 'deploy':
    deploy(configPath)
    break
  case 'db:local':
    applyDatabase(configPath, 'local')
    break
  case 'db:remote':
    applyDatabase(configPath, 'remote')
    break
  case 'release':
    build(configPath)
    deploy(configPath)
    break
  case 'dry-run':
    build(configPath)
    run(['wrangler', 'deploy', '--dry-run', '-c', configPath])
    break
  default:
    throw new Error(`Unknown Cloudflare command: ${command}`)
}
