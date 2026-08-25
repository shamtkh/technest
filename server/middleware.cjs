const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'db.json')

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf-8')
}

function nextId(list) {
  return list.length ? Math.max(...list.map((i) => i.id)) + 1 : 1
}

module.exports = (server) => {
  server.use(require('json-server').bodyParser)

  // ── POST /auth/login ──
  server.post('/auth/login', (req, res) => {
    const { email, password } = req.body
    const db = readDB()
    const user = db.users.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
    )
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    }
    const { password: _, ...safe } = user
    res.json(safe)
  })

  // ── POST /auth/register ──
  server.post('/auth/register', (req, res) => {
    const { name, email, password } = req.body
    const db = readDB()
    const exists = db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())
    if (exists) {
      return res.status(409).json({ error: 'EMAIL_TAKEN' })
    }
    const user = { id: nextId(db.users), name, email, password, role: 'customer' }
    db.users.push(user)
    writeDB(db)
    const { password: _, ...safe } = user
    res.status(201).json(safe)
  })

  // ── POST /orders (custom — decrement variant stock) ──
  server.post('/orders', (req, res) => {
    const order = req.body
    const db = readDB()

    const record = {
      ...order,
      id: nextId(db.orders),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    db.orders.unshift(record)

    // decrement variant stock
    if (record.items) {
      record.items.forEach((item) => {
        const product = db.products.find((p) => p.id === item.productId)
        if (product && product.variants) {
          const variant = product.variants.find(
            (v) => v.storage === item.storage && v.color === item.color
          )
          if (variant) {
            variant.stock = Math.max(0, variant.stock - item.qty)
          }
        }
      })
    }

    writeDB(db)
    res.status(201).json(record)
  })

  // ── PATCH /orders/:id (update status) ──
  server.patch('/orders/:id', (req, res) => {
    const id = Number(req.params.id)
    const { status } = req.body
    const db = readDB()
    const order = db.orders.find((o) => o.id === id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    order.status = status
    order.updatedAt = new Date().toISOString()
    writeDB(db)
    res.json(order)
  })
}
