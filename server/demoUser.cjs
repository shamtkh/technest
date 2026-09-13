const DEFAULT_DEMO_EMAIL = 'demo@technest.uz'
const DEFAULT_DEMO_PASSWORD = 'TechNestDemo2026!'

function getDemoCredentials() {
  return {
    email: (process.env.DEMO_EMAIL || DEFAULT_DEMO_EMAIL).trim().toLowerCase(),
    password: process.env.DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD,
  }
}

function ensureDemoUser(router) {
  const { email, password } = getDemoCredentials()
  router.db.defaults({ demoOrders: [] }).write()

  const users = router.db.get('users').value()
  const existing = users.find((user) => String(user.email || '').trim().toLowerCase() === email)

  if (existing && existing.role !== 'demo') {
    throw new Error(`Cannot seed demo account: ${email} belongs to a non-demo user`)
  }

  if (existing) {
    router.db.get('users').find({ id: existing.id }).assign({
      name: 'TechNest Demo',
      password,
      role: 'demo',
    }).write()
    return router.db.get('users').find({ id: existing.id }).value()
  }

  const nextId = users.length ? Math.max(...users.map((user) => Number(user.id) || 0)) + 1 : 1
  const demoUser = {
    id: nextId,
    name: 'TechNest Demo',
    email,
    password,
    role: 'demo',
  }
  router.db.get('users').push(demoUser).write()
  return demoUser
}

module.exports = { ensureDemoUser, getDemoCredentials }
