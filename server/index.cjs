const jsonServer = require('json-server')
const path = require('path')
const fs = require('fs')
const { Pool } = require('pg')
const { ensureDemoUser } = require('./demoUser.cjs')

const dbPath = path.join(__dirname, '..', 'src', 'data', 'db.json')

// Optional cloud backup (Neon/any Postgres). Render's free disk resets on
// every restart, so if DATABASE_URL is set, we snapshot db.json into a
// single JSONB row after every write and restore it on boot. Without
// DATABASE_URL (e.g. local dev) this is a no-op and behavior is unchanged.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null

async function restoreFromCloud() {
  if (!pool) return
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS db_snapshot (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())'
    )
    const { rows } = await pool.query('SELECT data FROM db_snapshot WHERE id = 1')
    if (rows.length) {
      fs.writeFileSync(dbPath, JSON.stringify(rows[0].data, null, 2) + '\n')
      console.log('  ☁️  Restored database from cloud snapshot')
    } else {
      const initial = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      await pool.query('INSERT INTO db_snapshot (id, data) VALUES (1, $1)', [initial])
      console.log('  ☁️  Seeded cloud snapshot from local db.json')
    }
  } catch (err) {
    console.error('  ⚠️  Cloud snapshot restore failed, falling back to local db.json:', err.message)
  }
}

async function backupToCloud() {
  if (!pool) return
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    await pool.query(
      `INSERT INTO db_snapshot (id, data, updated_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()`,
      [data]
    )
  } catch (err) {
    console.error('  ⚠️  Cloud snapshot backup failed:', err.message)
  }
}

async function start() {
  await restoreFromCloud()

  // json-server only builds its generic REST routes for collections that
  // exist when the router is created, so make sure newer collections are in
  // db.json (a restored cloud snapshot may predate them) before that happens.
  const rawDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  const missingCollections = ['reviews', 'promoCodes', 'banners'].filter((key) => !Array.isArray(rawDb[key]))
  if (missingCollections.length) {
    missingCollections.forEach((key) => { rawDb[key] = [] })
    fs.writeFileSync(dbPath, JSON.stringify(rawDb, null, 2) + '\n')
  }

  const server = jsonServer.create()
  const router = jsonServer.router(dbPath)
  const demoUser = ensureDemoUser(router)
  if (missingCollections.length) await backupToCloud()

  const legacyAdmin = router.db.get('users').find({ email: 'bexruz@gmail.com' }).value()
  if (legacyAdmin) {
    router.db.get('users').remove({ email: 'bexruz@gmail.com' }).write()
    await backupToCloud()
    console.log('  Removed legacy admin account: bexruz@gmail.com')
  }

  if (!router.db.get('supportSettings').find({ id: 1 }).value()) {
    router.db.get('supportSettings').push({ id: 1, telegram: '', phone: '', instagram: '' }).write()
    await backupToCloud()
  }

  // Migrate products created before variant support. Their stock did not get
  // decremented by older orders, so subtract existing order quantities once.
  const existingOrders = router.db.get('orders').value()
  let migratedProducts = false
  router.db.get('products').value().forEach((product) => {
    if (product.variants?.length) return

    const orderedQuantity = existingOrders.reduce((sum, order) => (
      sum + (order.items || [])
        .filter((item) => Number(item.productId) === Number(product.id))
        .reduce((itemSum, item) => itemSum + (Number(item.qty) || 0), 0)
    ), 0)
    const stock = Math.max(0, (Number(product.stock) || 0) - orderedQuantity)
    const variant = {
      storage: product.storage?.[0] || 'Standart',
      color: product.colors?.[0]?.name || '',
      stock,
    }

    router.db
      .get('products')
      .find({ id: product.id })
      .assign({ variants: [variant], stock })
      .write()
    migratedProducts = true
  })
  if (migratedProducts) await backupToCloud()

  // json-server's defaults() serves static files from ./public by default, which
  // would shadow API resources sharing a name with a folder in there (e.g. the
  // public/products/ image folder colliding with the /products API route).
  // This server doesn't need to serve any static files, so point it at a
  // non-existent directory to disable that behavior.
  const defaults = jsonServer.defaults({ noCors: false, static: path.join(__dirname, '.no-static') })

  // defaults() (CORS, no-cache headers, etc.) must run before the custom routes
  // below — otherwise their responses go out without CORS headers and browsers
  // silently block them (they still succeed when hit directly, e.g. via curl).
  // Let browsers cache CORS preflights (the site and API are on different
  // origins in production) instead of re-checking before every write.
  server.use((req, res, next) => {
    if (req.method === 'OPTIONS') res.setHeader('Access-Control-Max-Age', '7200')
    next()
  })
  server.use(defaults)
  server.use(jsonServer.bodyParser)

  // Back up to the cloud after every successful write, regardless of which
  // route handled it (custom routes below, or json-server's generic CRUD).
  server.use((req, res, next) => {
    res.on('finish', () => {
      if (req.method !== 'GET' && res.statusCode < 400) backupToCloud()
    })
    next()
  })

  function normalizeProductPayload(payload) {
    const product = { ...payload }
    const storage = Array.isArray(product.storage) && product.storage.length
      ? product.storage
      : ['Standart']
    const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : []

    if (!variants.length) {
      product.variants = [{ storage: storage[0], color: '', stock: Number(product.stock) || 0 }]
    } else {
      product.variants = variants.map((variant) => ({
        ...variant,
        storage: variant.storage || storage[0],
        color: variant.color || '',
        stock: Math.max(0, Number(variant.stock) || 0),
      }))
    }
    product.storage = storage
    product.stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)
    return product
  }

  function findProduct(productId) {
    return router.db.get('products').value().find((product) => Number(product.id) === Number(productId))
  }

  function getOrderVariant(product, item) {
    if (!product?.variants?.length) return null
    const storage = item.storage || product.storage?.[0] || 'Standart'
    const color = item.color || ''
    return product.variants.find((variant) => variant.storage === storage && variant.color === color)
  }

  function getSupportSettings() {
    const settings = router.db.get('supportSettings').value()
    if (Array.isArray(settings) && settings.length > 0) return settings[0]

    const defaults = { id: 1, telegram: '', phone: '', instagram: '' }
    router.db.set('supportSettings', [defaults]).write()
    return defaults
  }

  function nextIdOf(collection) {
    const items = router.db.get(collection).value()
    return items.length ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1 : 1
  }

  function findUser(userId) {
    return router.db.get('users').value().find((user) => Number(user.id) === Number(userId))
  }

  function safeUser(user) {
    const { password: _, ...safe } = user
    return safe
  }

  // ── Promo codes ──
  function normalizePromoCode(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '')
  }

  function evaluatePromo(code, subtotal) {
    const normalized = normalizePromoCode(code)
    const promo = router.db.get('promoCodes').value().find((item) => item.code === normalized)
    if (!normalized || !promo || !promo.active) return { error: 'PROMO_INVALID' }
    // expiresAt is a calendar date; the code stays valid through the end of that day.
    if (promo.expiresAt && new Date(`${promo.expiresAt}T23:59:59`) < new Date()) return { error: 'PROMO_EXPIRED' }
    if (promo.maxUses && (Number(promo.uses) || 0) >= Number(promo.maxUses)) return { error: 'PROMO_USED_UP' }
    if (promo.minTotal && subtotal < Number(promo.minTotal)) return { error: 'PROMO_MIN_TOTAL', minTotal: Number(promo.minTotal) }
    const discount = promo.type === 'percent'
      ? Math.round((subtotal * Math.min(100, Number(promo.value) || 0)) / 100)
      : Math.min(Number(promo.value) || 0, subtotal)
    return { promo, discount }
  }

  function normalizePromoPayload(body, current = {}) {
    const merged = { ...current, ...body }
    return {
      code: normalizePromoCode(merged.code),
      type: merged.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(merged.value) || 0),
      minTotal: Math.max(0, Number(merged.minTotal) || 0),
      maxUses: Math.max(0, Number(merged.maxUses) || 0),
      expiresAt: merged.expiresAt ? String(merged.expiresAt).slice(0, 10) : '',
      active: merged.active !== false,
      uses: Number(current.uses) || 0,
    }
  }

  server.post('/promo/validate', (req, res) => {
    const result = evaluatePromo(req.body.code, Math.max(0, Number(req.body.subtotal) || 0))
    if (result.error) return res.status(400).json({ error: result.error, minTotal: result.minTotal })
    const { code, type, value } = result.promo
    res.json({ code, type, value, discount: result.discount })
  })

  server.post('/promoCodes', (req, res) => {
    const promo = normalizePromoPayload(req.body)
    if (!promo.code || promo.value <= 0) return res.status(400).json({ error: 'PROMO_INVALID' })
    if (promo.type === 'percent' && promo.value > 100) return res.status(400).json({ error: 'PROMO_INVALID' })
    if (router.db.get('promoCodes').find({ code: promo.code }).value()) return res.status(409).json({ error: 'PROMO_EXISTS' })
    const record = { ...promo, id: nextIdOf('promoCodes'), createdAt: new Date().toISOString() }
    router.db.get('promoCodes').push(record).write()
    res.status(201).json(record)
  })

  server.patch('/promoCodes/:id', (req, res) => {
    const id = Number(req.params.id)
    const current = router.db.get('promoCodes').find({ id }).value()
    if (!current) return res.status(404).json({ error: 'Promo code not found' })
    const promo = normalizePromoPayload(req.body, current)
    const duplicate = router.db.get('promoCodes').value().some((item) => item.id !== id && item.code === promo.code)
    if (duplicate) return res.status(409).json({ error: 'PROMO_EXISTS' })
    router.db.get('promoCodes').find({ id }).assign(promo).write()
    res.json(router.db.get('promoCodes').find({ id }).value())
  })

  // ── Reviews ──
  function recomputeProductRating(productId) {
    const product = findProduct(productId)
    if (!product) return
    const reviews = router.db.get('reviews').value().filter((review) => Number(review.productId) === Number(productId))
    // Products ship with a seeded rating. Remember it the first time real
    // reviews take over, so deleting every review falls back to it.
    const seedRating = product.seedRating ?? product.rating ?? 0
    const rating = reviews.length
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
      : seedRating
    router.db.get('products').find((entry) => Number(entry.id) === Number(productId))
      .assign({ rating, reviews: reviews.length, seedRating })
      .write()
  }

  function userBoughtProduct(userId, productId) {
    return router.db.get('orders').value().some((order) => (
      Number(order.userId) === Number(userId)
      && (order.items || []).some((item) => Number(item.productId) === Number(productId))
    ))
  }

  server.get('/reviews', (req, res) => {
    const productId = req.query.productId
    const reviews = router.db.get('reviews').value()
      .filter((review) => productId === undefined || Number(review.productId) === Number(productId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(reviews)
  })

  server.post('/reviews', (req, res) => {
    const user = findUser(req.body.userId)
    const product = findProduct(req.body.productId)
    const rating = Math.round(Number(req.body.rating))
    const text = String(req.body.text || '').trim().slice(0, 2000)
    const images = (Array.isArray(req.body.images) ? req.body.images : [])
      .filter((image) => typeof image === 'string' && image.startsWith('data:image/') && image.length < 400_000)
      .slice(0, 3)
    if (!user || user.role === 'admin') return res.status(403).json({ error: 'REVIEW_FORBIDDEN' })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    if (!(rating >= 1 && rating <= 5) || text.length < 3) return res.status(400).json({ error: 'REVIEW_INVALID' })

    // One review per customer per product: posting again edits the old one.
    const existing = router.db.get('reviews').value()
      .find((review) => Number(review.productId) === product.id && Number(review.userId) === user.id)
    const record = {
      productId: product.id,
      userId: user.id,
      userName: user.name,
      rating,
      text,
      images,
      verified: userBoughtProduct(user.id, product.id),
    }
    if (existing) {
      router.db.get('reviews').find({ id: existing.id }).assign({ ...record, updatedAt: new Date().toISOString() }).write()
    } else {
      router.db.get('reviews').push({ ...record, id: nextIdOf('reviews'), createdAt: new Date().toISOString() }).write()
    }
    recomputeProductRating(product.id)
    const saved = router.db.get('reviews').value()
      .find((review) => Number(review.productId) === product.id && Number(review.userId) === user.id)
    res.status(existing ? 200 : 201).json(saved)
  })

  server.delete('/reviews/:id', (req, res) => {
    const id = Number(req.params.id)
    const review = router.db.get('reviews').find({ id }).value()
    if (!review) return res.status(404).json({ error: 'Review not found' })
    const requester = findUser(req.query.userId)
    if (!requester || (requester.role !== 'admin' && requester.id !== Number(review.userId))) {
      return res.status(403).json({ error: 'REVIEW_FORBIDDEN' })
    }
    router.db.get('reviews').remove({ id }).write()
    recomputeProductRating(review.productId)
    res.status(204).end()
  })

  // ── Per-user wishlist and saved addresses (synced across devices) ──
  server.put('/users/:id/wishlist', (req, res) => {
    const user = findUser(req.params.id)
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' })
    const productIds = [...new Set((Array.isArray(req.body.productIds) ? req.body.productIds : []).map(Number))]
      .filter((productId) => findProduct(productId))
      .slice(0, 200)
    router.db.get('users').find({ id: user.id }).assign({ wishlist: productIds }).write()
    res.json({ wishlist: productIds })
  })

  server.put('/users/:id/addresses', (req, res) => {
    const user = findUser(req.params.id)
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' })
    const clean = (value) => String(value || '').trim().slice(0, 200)
    const addresses = (Array.isArray(req.body.addresses) ? req.body.addresses : [])
      .slice(0, 10)
      .map((address, index) => ({
        id: clean(address.id) || `addr-${Date.now()}-${index}`,
        label: clean(address.label),
        city: clean(address.city),
        street: clean(address.street),
        house: clean(address.house),
        apartment: clean(address.apartment),
        landmark: clean(address.landmark),
        isDefault: Boolean(address.isDefault),
      }))
      .filter((address) => address.city && address.street && address.house)
    if (addresses.length && !addresses.some((address) => address.isDefault)) addresses[0].isDefault = true
    router.db.get('users').find({ id: user.id }).assign({ addresses }).write()
    res.json({ addresses })
  })

  // ── Recommendations: products that appear in the same orders ──
  server.get('/products/:id/bought-together', (req, res) => {
    const productId = Number(req.params.id)
    const counts = new Map()
    router.db.get('orders').value().forEach((order) => {
      const ids = new Set((order.items || []).map((item) => Number(item.productId)))
      if (!ids.has(productId)) return
      ids.forEach((otherId) => {
        if (otherId !== productId) counts.set(otherId, (counts.get(otherId) || 0) + 1)
      })
    })
    const result = [...counts.entries()]
      .filter(([otherId]) => findProduct(otherId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([otherId, count]) => ({ productId: otherId, count }))
    res.json(result)
  })

  // ── Bulk stock update (CSV import from the admin panel) ──
  // All rows are validated first; nothing is written unless every row is valid.
  server.post('/products/bulk-stock', (req, res) => {
    const updates = Array.isArray(req.body.updates) ? req.body.updates : []
    if (!updates.length) return res.status(400).json({ error: 'BULK_EMPTY', errors: [] })

    const errors = []
    const resolved = updates.map((update, index) => {
      const product = findProduct(update.productId)
      const stock = Number(update.stock)
      if (!product) { errors.push({ row: index, error: 'PRODUCT_NOT_FOUND' }); return null }
      if (!Number.isInteger(stock) || stock < 0) { errors.push({ row: index, error: 'INVALID_STOCK' }); return null }
      const variantIdx = (product.variants || []).findIndex(
        (variant) => variant.storage === String(update.storage ?? '').trim() && variant.color === String(update.color ?? '').trim()
      )
      if (variantIdx === -1) { errors.push({ row: index, error: 'VARIANT_NOT_FOUND' }); return null }
      return { productId: product.id, variantIdx, stock }
    })
    if (errors.length) return res.status(400).json({ error: 'BULK_INVALID', errors })

    const touched = new Set()
    resolved.forEach(({ productId, variantIdx, stock }) => {
      router.db.get('products').find({ id: productId }).get('variants').nth(variantIdx).assign({ stock }).write()
      touched.add(productId)
    })
    touched.forEach((productId) => {
      const product = findProduct(productId)
      const total = product.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
      router.db.get('products').find({ id: productId }).assign({ stock: total }).write()
    })
    res.json({ updated: resolved.length, products: touched.size })
  })

  server.get('/supportSettings/:id', (req, res) => {
    const settings = getSupportSettings()
    if (String(settings.id) !== String(req.params.id)) return res.status(404).json({ error: 'Support settings not found' })
    res.json(settings)
  })

  server.patch('/supportSettings/:id', (req, res) => {
    const settings = getSupportSettings()
    if (String(settings.id) !== String(req.params.id)) return res.status(404).json({ error: 'Support settings not found' })

    const updated = {
      ...settings,
      telegram: String(req.body.telegram || '').trim(),
      phone: String(req.body.phone || '').trim(),
      instagram: String(req.body.instagram || '').trim(),
    }
    router.db.set('supportSettings', [updated]).write()
    res.json(updated)
  })

  server.post('/products', (req, res) => {
    const product = normalizeProductPayload(req.body)
    const products = router.db.get('products').value()
    const nextId = products.length ? Math.max(...products.map((item) => Number(item.id) || 0)) + 1 : 1
    const record = { ...product, id: nextId }
    router.db.get('products').push(record).write()
    res.status(201).json(record)
  })

  server.patch('/products/:id', (req, res) => {
    const id = Number(req.params.id)
    const current = router.db.get('products').find({ id }).value()
    if (!current) return res.status(404).json({ error: 'Product not found' })
    const record = normalizeProductPayload({ ...current, ...req.body })
    router.db.get('products').find({ id }).assign(record).write()
    res.json(router.db.get('products').find({ id }).value())
  })

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
    const { name, password } = req.body
    // Normalize the same way /auth/login does, otherwise an email saved with
    // stray whitespace/casing here can never match a trimmed login attempt.
    const email = String(req.body.email || '').trim().toLowerCase()
    const users = router.db.get('users').value()
    const exists = users.some((u) => u.email.toLowerCase() === email)
    if (exists) return res.status(409).json({ error: 'EMAIL_TAKEN' })

    const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1
    const user = { id: nextId, name: String(name || '').trim(), email, password, role: 'customer', createdAt: new Date().toISOString() }

    router.db.get('users').push(user).write()

    const { password: _, ...safe } = user
    res.status(201).json(safe)
  })

  // Demo orders live outside the real orders collection and never reserve stock.
  server.get('/orders', (req, res, next) => {
    if (String(req.query.userId) !== String(demoUser.id)) return next()
    const demoOrders = router.db.get('demoOrders').value()
      .filter((order) => String(order.userId) === String(demoUser.id))
      .sort((a, b) => Number(b.id) - Number(a.id))
    res.json(demoOrders)
  })

  // ── GET /users — strip passwords before they ever leave the server ──
  server.get('/users', (_req, res) => {
    const users = router.db.get('users').value()
    res.json(users.map(({ password: _, ...safe }) => safe))
  })

  server.patch('/users/:id', (req, res) => {
    const id = Number(req.params.id)
    const current = router.db.get('users').find({ id }).value()
    if (!current) return res.status(404).json({ error: 'USER_NOT_FOUND' })
    if (req.body.password && req.body.currentPassword !== current.password) {
      return res.status(401).json({ error: 'INVALID_CURRENT_PASSWORD' })
    }

    const email = String(req.body.email ?? current.email).trim().toLowerCase()
    const duplicate = router.db.get('users').value().some((user) => user.id !== id && user.email.toLowerCase() === email)
    if (duplicate) return res.status(409).json({ error: 'EMAIL_TAKEN' })

    const updated = {
      ...current,
      name: String(req.body.name ?? current.name).trim(),
      email,
      phone: String(req.body.phone ?? current.phone ?? '').trim(),
      ...(req.body.password ? { password: String(req.body.password) } : {}),
    }
    router.db.get('users').find({ id }).assign(updated).write()
    const { password: _, ...safeUser } = updated
    res.json(safeUser)
  })

  // ── POST /orders — custom: decrement variant stock ──
  server.post('/orders', (req, res) => {
    const body = { ...req.body }
    const isDemoOrder = Number(body.userId) === Number(demoUser.id)

    // Ordering requires an account.
    const customer = router.db.get('users').value().find((user) => Number(user.id) === Number(body.userId))
    if (!body.userId || !customer) return res.status(401).json({ error: 'AUTH_REQUIRED' })

    // Recompute money server-side from catalog prices so neither the item
    // prices nor the promo discount can be forged by the client.
    body.items = (body.items || []).map((item) => {
      const product = findProduct(item.productId)
      return product ? { ...item, price: Number(product.price) || 0 } : item
    })
    const subtotal = body.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0)
    let discount = 0
    let appliedPromo = null
    if (body.promoCode) {
      const result = evaluatePromo(body.promoCode, subtotal)
      if (result.error) return res.status(400).json({ error: result.error, minTotal: result.minTotal })
      discount = result.discount
      appliedPromo = result.promo
    }
    body.subtotal = subtotal
    body.discount = discount
    body.promoCode = appliedPromo ? appliedPromo.code : null
    body.total = subtotal - discount

    if (body.userId && body.contact?.phone) {
      router.db.get('users').find({ id: Number(body.userId) }).assign({
        phone: String(body.contact.phone).trim(),
      }).write()
    }
    const orders = router.db.get('orders').value()
    const nextId = orders.length ? Math.max(...orders.map((order) => Number(order.id) || 0)) + 1 : 1

    if (isDemoOrder) {
      const demoOrders = router.db.get('demoOrders').value()
      const nextDemoId = demoOrders.length
        ? Math.max(...demoOrders.map((order) => Number(order.id) || 0)) + 1
        : 1
      const demoRecord = {
        ...body,
        id: nextDemoId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      router.db.get('demoOrders').push(demoRecord).write()
      return res.status(201).json(demoRecord)
    }

    for (const item of body.items || []) {
      const product = findProduct(item.productId)
      const requestedQuantity = Number(item.qty) || 0
      if (!product || requestedQuantity <= 0) {
        return res.status(400).json({ error: 'INVALID_ORDER_ITEM' })
      }

      // Carts persist across sessions, so a cart item's storage/color may no
      // longer match any real variant (admin renamed/removed it since it was
      // added). Falling back to the product's aggregate stock here would let
      // the order pass validation while the decrement step below finds no
      // matching variant to reduce, silently desyncing inventory.
      if (product.variants?.length) {
        const variant = getOrderVariant(product, item)
        if (!variant) return res.status(409).json({ error: 'INVALID_ORDER_ITEM' })
        if (requestedQuantity > (Number(variant.stock) || 0)) {
          return res.status(409).json({ error: 'INSUFFICIENT_STOCK' })
        }
      } else if (requestedQuantity > (Number(product.stock) || 0)) {
        return res.status(409).json({ error: 'INSUFFICIENT_STOCK' })
      }
    }

    const record = {
      ...body,
      id: nextId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    // decrement variant stock in memory + disk via lowdb
    if (record.items && record.items.length) {
      record.items.forEach((item) => {
        const product = findProduct(item.productId)
        if (product && product.variants?.length) {
          const variant = getOrderVariant(product, item)
          const variantIdx = variant ? product.variants.indexOf(variant) : -1
          if (variantIdx !== -1) {
            const newStock = Math.max(0, (Number(product.variants[variantIdx].stock) || 0) - Number(item.qty || 0))
            router.db
              .get('products')
              .find((entry) => Number(entry.id) === Number(item.productId))
              .get('variants')
              .nth(variantIdx)
              .assign({ stock: newStock })
              .write()
          }
        } else if (product) {
          const newStock = Math.max(0, (Number(product.stock) || 0) - Number(item.qty || 0))
          router.db.get('products').find((entry) => Number(entry.id) === Number(item.productId)).assign({ stock: newStock }).write()
        }
        const updatedProduct = findProduct(item.productId)
        if (updatedProduct?.variants?.length) {
          const totalStock = updatedProduct.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
          router.db.get('products').find((entry) => Number(entry.id) === Number(item.productId)).assign({ stock: totalStock }).write()
        }
      })
    }

    router.db.get('orders').push(record).write()
    if (appliedPromo) {
      router.db.get('promoCodes').find({ id: appliedPromo.id })
        .assign({ uses: (Number(appliedPromo.uses) || 0) + 1 })
        .write()
    }
    res.status(201).json(record)
  })

  // ── PATCH /orders/:id — update status, forward only ──
  const STATUS_FLOW = ['pending', 'accepted', 'transit', 'delivered']
  const LEGACY_STATUS = { new: 'pending', processing: 'accepted' }
  server.patch('/orders/:id', (req, res) => {
    const id = Number(req.params.id)
    const { status } = req.body
    const order = router.db.get('orders').find({ id }).value()
    if (!order) return res.status(404).json({ error: 'Order not found' })
    const next = STATUS_FLOW.indexOf(status)
    if (next === -1) return res.status(400).json({ error: 'INVALID_STATUS' })
    const current = STATUS_FLOW.indexOf(LEGACY_STATUS[order.status] || order.status)
    // pending → accepted → transit → delivered; never back (e.g. delivered → pending).
    if (next < current) return res.status(409).json({ error: 'STATUS_BACKWARD' })
    if (next === current) return res.json(order)

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
        if (!product) return

        if (!product.variants?.length) {
          router.db
            .get('products')
            .find({ id: item.productId })
            .assign({ stock: (Number(product.stock) || 0) + Number(item.qty || 0) })
            .write()
          return
        }

        const variantIdx = product.variants.findIndex(
          (variant) => variant.storage === (item.storage || 'Standart') && variant.color === (item.color || '')
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

  // Clear one shared support conversation for both the admin and customer.
  server.delete('/messages/user/:userId', (req, res) => {
    const userId = Number(req.params.userId)
    router.db.get('messages').remove((message) => Number(message.userId) === userId).write()
    res.status(204).end()
  })

  server.use(router)

  const PORT = process.env.PORT || 3001
  server.listen(PORT, () => {
    console.log(`\n  ✅ JSON Server running on http://localhost:${PORT}`)
    console.log(`  📁 Database: ${dbPath}`)
    console.log(`  ☁️  Cloud backup: ${pool ? 'enabled' : 'disabled (no DATABASE_URL)'}\n`)
  })
}

start()
