const jsonServer = require('json-server')
const path = require('path')

const server = jsonServer.create()
const dbPath = path.join(__dirname, '..', 'src', 'data', 'db.json')
const router = jsonServer.router(dbPath)
// json-server's defaults() serves static files from ./public by default, which
// would shadow API resources sharing a name with a folder in there (e.g. the
// public/products/ image folder colliding with the /products API route).
// This server doesn't need to serve any static files, so point it at a
// non-existent directory to disable that behavior.
const defaults = jsonServer.defaults({ noCors: false, static: path.join(__dirname, '.no-static') })

// defaults() (CORS, no-cache headers, etc.) must run before the custom routes
// below — otherwise their responses go out without CORS headers and browsers
// silently block them (they still succeed when hit directly, e.g. via curl).
server.use(defaults)
server.use(jsonServer.bodyParser)

// ── POST /auth/login ──
server.post('/auth/login', (req, res) => {
  const { email, password } = req.body
  const users = router.db.get('users').value()
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  )
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
  const { password: _, ...safe } = user
  res.json(safe)
})

// ── POST /auth/register ──
server.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body
  const users = router.db.get('users').value()
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase())
  if (exists) return res.status(409).json({ error: 'EMAIL_TAKEN' })

  const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1
  const user = { id: nextId, name, email, password, role: 'customer' }

  router.db.get('users').push(user).write()

  const { password: _, ...safe } = user
  res.status(201).json(safe)
})

// ── POST /orders — custom: decrement variant stock ──
server.post('/orders', (req, res) => {
  const body = req.body
  const orders = router.db.get('orders').value()
  const nextId = orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1

  const record = {
    ...body,
    id: nextId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  // decrement variant stock in memory + disk via lowdb
  if (record.items && record.items.length) {
    record.items.forEach((item) => {
      const product = router.db.get('products').find({ id: item.productId }).value()
      if (product && product.variants) {
        const variantIdx = product.variants.findIndex(
          (v) => v.storage === item.storage && v.color === item.color
        )
        if (variantIdx !== -1) {
          const newStock = Math.max(0, product.variants[variantIdx].stock - item.qty)
          router.db
            .get('products')
            .find({ id: item.productId })
            .get('variants')
            .nth(variantIdx)
            .assign({ stock: newStock })
            .write()
        }
      }
    })
  }

  router.db.get('orders').push(record).write()
  res.status(201).json(record)
})

// ── PATCH /orders/:id — update status ──
server.patch('/orders/:id', (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const order = router.db.get('orders').find({ id }).value()
  if (!order) return res.status(404).json({ error: 'Order not found' })

  router.db
    .get('orders')
    .find({ id })
    .assign({ status, updatedAt: new Date().toISOString() })
    .write()

  const updated = router.db.get('orders').find({ id }).value()
  res.json(updated)
})

// ── DELETE /orders/:id — admin test cleanup ──
server.delete('/orders/:id', (req, res) => {
  const id = Number(req.params.id)
  const order = router.db.get('orders').find({ id }).value()
  if (!order) return res.status(404).json({ error: 'Order not found' })

  // A pending order reserved stock. Release those reservations when the admin cancels it.
  if (order.status === 'pending' && order.items?.length) {
    order.items.forEach((item) => {
      const product = router.db.get('products').find({ id: item.productId }).value()
      if (!product?.variants) return

      const variantIdx = product.variants.findIndex(
        (variant) => variant.storage === item.storage && variant.color === item.color
      )
      if (variantIdx === -1) return

      router.db
        .get('products')
        .find({ id: item.productId })
        .get('variants')
        .nth(variantIdx)
        .assign({ stock: (product.variants[variantIdx].stock || 0) + item.qty })
        .write()
    })
  }

  router.db.get('orders').remove({ id }).write()
  res.status(204).end()
})

server.use(router)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`\n  ✅ JSON Server running on http://localhost:${PORT}`)
  console.log(`  📁 Database: ${dbPath}\n`)
})
