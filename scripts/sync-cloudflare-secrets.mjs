import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const repoRoot = resolve(import.meta.dirname, '..')
const configPath = resolve(repoRoot, process.env.WRANGLER_CONFIG?.trim() || 'wrangler.toml')
const wranglerCli = resolve(repoRoot, 'node_modules/wrangler/bin/wrangler.js')

if (!existsSync(configPath)) throw new Error(`Wrangler config not found: ${configPath}`)
if (!existsSync(wranglerCli)) throw new Error('Missing Wrangler CLI dependency')

const requiredNames = ['ADMIN_PASSWORD', 'ADMIN_TOKEN_SALT', 'AI_CONFIG_ENCRYPTION_SECRET']
const secrets = {}

for (const name of requiredNames) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required secret: ${name}`)
  secrets[name] = value
}

if (process.env.AI_API_KEY) secrets.AI_API_KEY = process.env.AI_API_KEY

const result = spawnSync(
  process.execPath,
  [wranglerCli, 'secret', 'bulk', '-c', configPath],
  {
    cwd: repoRoot,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    input: JSON.stringify(secrets),
    stdio: ['pipe', 'inherit', 'inherit'],
  },
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

console.log(`Synced ${Object.keys(secrets).length} Cloudflare Worker secrets.`)
