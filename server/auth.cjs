// Passwords, session tokens and a login rate limiter. No dependencies: all
// of it is built on Node's crypto module.
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// ── Passwords: scrypt with a random per-user salt ──
// Stored as "scrypt$<salt hex>$<hash hex>".
const HASH_PREFIX = 'scrypt$'
const KEY_LENGTH = 64

function isHashed(stored) {
  return typeof stored === 'string' && stored.startsWith(HASH_PREFIX)
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, KEY_LENGTH).toString('hex')
  return `${HASH_PREFIX}${salt}$${hash}`
}

function verifyPassword(password, stored) {
  if (!isHashed(stored) || typeof password !== 'string') return false
  const [, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'hex')
  const actual = crypto.scryptSync(password, salt, expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

// ── Session tokens: HMAC-signed { uid, v, exp } ──
// `v` is the user's sessionVersion: bumping it (password change) signs out
// every other device. Tokens are stateless, so nothing about sessions has to
// live in db.json (which json-server would otherwise expose).
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  if (process.env.RENDER) {
    console.warn('  ⚠️  SESSION_SECRET is not set: sign-ins will not survive a restart')
  }
  // Local dev: keep one generated secret across restarts (gitignored).
  const file = path.join(__dirname, '.session-secret')
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    const secret = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(file, secret)
    return secret
  }
}

const SECRET = loadSecret()
const base64url = (buffer) => Buffer.from(buffer).toString('base64url')
const signature = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url')

function createToken(user) {
  const payload = base64url(JSON.stringify({ uid: user.id, v: user.sessionVersion || 0, exp: Date.now() + TOKEN_TTL_MS }))
  return `${payload}.${signature(payload)}`
}

// Returns the payload of a valid, unexpired token, or null.
function readToken(token) {
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(signature(payload))
  const actual = Buffer.from(sig)
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return data.exp > Date.now() ? data : null
  } catch {
    return null
  }
}

// ── Rate limiting (in memory; resets on restart) ──
function createRateLimiter({ limit, windowMs }) {
  const hits = new Map()
  const current = (key) => {
    const entry = hits.get(key)
    if (entry && entry.resetAt <= Date.now()) {
      hits.delete(key)
      return null
    }
    return entry
  }
  return {
    blocked: (key) => (current(key)?.count || 0) >= limit,
    hit(key) {
      const entry = current(key) || { count: 0, resetAt: Date.now() + windowMs }
      entry.count += 1
      hits.set(key, entry)
      if (hits.size > 10_000) hits.delete(hits.keys().next().value)
    },
    reset: (key) => hits.delete(key),
  }
}

module.exports = { isHashed, hashPassword, verifyPassword, createToken, readToken, createRateLimiter }
