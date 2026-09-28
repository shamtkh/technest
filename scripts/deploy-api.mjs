// Deploys the API (server/index.cjs) to Render and waits until it's live.
//
//   npm run deploy:api            deploy the current commit (must be pushed)
//   npm run deploy:api -- --force deploy even if that commit is already live
//
// Render builds from GitHub, so the commit has to be on origin first. The
// service has Auto-Deploy on, but pushes don't trigger it, hence this script.
// Needs RENDER_API_KEY (Render → Account Settings → API Keys) in .env.local
// or the environment; RENDER_SERVICE_ID overrides the default service.
import { execSync } from 'node:child_process'

try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local: rely on the environment.
}

const API_KEY = process.env.RENDER_API_KEY
const SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-da6sh7c9v7es738aj8ag'
const FORCE = process.argv.includes('--force')
const POLL_MS = 5000
const TIMEOUT_MS = 10 * 60 * 1000
const DONE = new Set(['live', 'build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated'])

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

async function render(path, options = {}) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) fail(`Render API ${options.method || 'GET'} ${path}: HTTP ${res.status} ${body?.message || ''}`)
  return body
}

const git = (command) => execSync(`git ${command}`, { encoding: 'utf8' }).trim()

if (!API_KEY) fail('RENDER_API_KEY is not set (add it to .env.local)')

const sha = git('rev-parse HEAD')
const subject = git('log -1 --format=%s')
git('fetch --quiet origin')
if (!git('branch -r --contains HEAD').split('\n').some((branch) => branch.trim() === 'origin/main')) {
  fail(`${sha.slice(0, 7)} is not on origin/main yet — push it first`)
}

const service = await render(`/services/${SERVICE_ID}`)
const url = service.serviceDetails?.url
const [latest] = await render(`/services/${SERVICE_ID}/deploys?limit=1`)
if (!FORCE && latest?.deploy.status === 'live' && latest.deploy.commit?.id === sha) {
  console.log(`✓ ${sha.slice(0, 7)} is already live on ${url} (use --force to redeploy)`)
  process.exit(0)
}

console.log(`→ Deploying ${sha.slice(0, 7)} "${subject}" to ${service.name}`)
const deploy = await render(`/services/${SERVICE_ID}/deploys`, {
  method: 'POST',
  body: JSON.stringify({ clearCache: 'do_not_clear', commitId: sha }),
})
const dashboard = `https://dashboard.render.com/web/${SERVICE_ID}/deploys/${deploy.id}`

let status = deploy.status
console.log(`  ${status}`)
const started = Date.now()
while (!DONE.has(status)) {
  if (Date.now() - started > TIMEOUT_MS) fail(`still ${status} after 10 minutes — see ${dashboard}`)
  await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  const next = (await render(`/services/${SERVICE_ID}/deploys/${deploy.id}`)).status
  if (next !== status) console.log(`  ${next}`)
  status = next
}
if (status !== 'live') fail(`deploy ${status} — logs: ${dashboard}`)

// Smoke test: the API answers and the custom banner route is in place.
for (const path of ['/categories', '/banners']) {
  const res = await fetch(`${url}${path}`).catch(() => null)
  const ok = res?.ok && Array.isArray(await res.json().catch(() => null))
  if (!ok) fail(`live, but GET ${path} failed (HTTP ${res?.status ?? 'no response'}) — ${dashboard}`)
}
console.log(`✓ Live on ${url} (${Math.round((Date.now() - started) / 1000)}s)`)
