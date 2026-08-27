const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'

async function request(url, options = {}) {
  let res
  try {
    res = await fetch(`${BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
  } catch {
    throw new Error('API_UNAVAILABLE')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// compute total stock from variants
function computeStock(product) {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
  }
  return Number(product.stock) || 0
}

export const api = {
  // ---------- products ----------
  async getProducts() {
    const products = await request('/products')
    return products.map((p) => ({ ...p, stock: computeStock(p) }))
  },

  async getProduct(id) {
    const product = await request(`/products/${id}`)
    return { ...product, stock: computeStock(product) }
  },

  async createProduct(payload) {
    const product = await request('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return { ...product, stock: computeStock(product) }
  },

  async updateProduct(id, payload) {
    const product = await request(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return { ...product, stock: computeStock(product) }
  },

  async deleteProduct(id) {
    await request(`/products/${id}`, { method: 'DELETE' })
    return { id: Number(id) }
  },

  // ---------- auth ----------
  async login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: String(email).trim(), password }),
    })
  },

  async register({ name, email, password }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  },

  // ---------- orders ----------
  async createOrder(order) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    })
  },

  async getMyOrders(userId) {
    return request(`/orders?userId=${userId}&_sort=id&_order=desc`)
  },

  async getAllOrders() {
    // json-server returns in insertion order, we want newest first
    const orders = await request('/orders?_sort=id&_order=desc')
    return orders
  },

  async updateOrderStatus(orderId, status) {
    return request(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, updatedAt: new Date().toISOString() }),
    })
  },

  async deleteOrder(orderId) {
    await request(`/orders/${orderId}`, { method: 'DELETE' })
    return { id: Number(orderId) }
  },

  // ---------- support chat ----------
  async getMyMessages(userId) {
    return request(`/messages?userId=${userId}&_sort=id&_order=asc`)
  },

  async getAllMessages() {
    return request('/messages?_sort=id&_order=asc')
  },

  async sendMessage({ userId, userName, sender, text }) {
    return request('/messages', {
      method: 'POST',
      body: JSON.stringify({ userId, userName, sender, text, createdAt: new Date().toISOString() }),
    })
  },

  async markMessageRead(messageId) {
    return request(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ readAt: new Date().toISOString() }),
    })
  },

  async clearConversation(userId) {
    const messages = await request(`/messages?userId=${encodeURIComponent(userId)}`)
    await Promise.all(messages.map((message) => request(`/messages/${message.id}`, { method: 'DELETE' })))
  },

  async getUsers() {
    const users = await request('/users')
    return users.map((user) => {
      const safeUser = { ...user }
      delete safeUser.password
      return safeUser
    })
  },
}

export default api
