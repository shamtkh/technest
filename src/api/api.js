const BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:3001')

async function request(url, options = {}) {
  let res
  try {
    // Content-Type only when there's a body: on a GET it turns a simple
    // cross-origin request into one that needs a CORS preflight, i.e. an
    // extra round trip to the API before every read.
    const headers = options.body
      ? { 'Content-Type': 'application/json', ...options.headers }
      : { ...options.headers }
    res = await fetch(`${BASE}${url}`, { ...options, headers })
  } catch {
    throw new Error('API_UNAVAILABLE')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = new Error(data.error || `HTTP ${res.status}`)
    error.data = data
    throw error
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
  // ---------- support contacts ----------
  async getSupportSettings() {
    const settings = await request('/supportSettings/1')
    return { telegram: '', phone: '', instagram: '', ...settings }
  },

  async updateSupportSettings(payload) {
    const settings = await request('/supportSettings/1', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return { telegram: '', phone: '', instagram: '', ...settings }
  },

  // ---------- categories ----------
  async getCategories() {
    return request('/categories')
  },

  async createCategory(payload) {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteCategory(id) {
    await request(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return { id }
  },

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

  async updateUser(id, payload) {
    const user = await request(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    const safeUser = { ...user }
    delete safeUser.password
    return safeUser
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

  // ---------- wishlist / saved addresses ----------
  async updateWishlist(userId, productIds) {
    const { wishlist } = await request(`/users/${encodeURIComponent(userId)}/wishlist`, {
      method: 'PUT',
      body: JSON.stringify({ productIds }),
    })
    return wishlist
  },

  async updateAddresses(userId, addresses) {
    const result = await request(`/users/${encodeURIComponent(userId)}/addresses`, {
      method: 'PUT',
      body: JSON.stringify({ addresses }),
    })
    return result.addresses
  },

  // ---------- reviews ----------
  async getReviews(productId) {
    return request(`/reviews?productId=${encodeURIComponent(productId)}`)
  },

  async saveReview(payload) {
    return request('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteReview(reviewId, userId) {
    await request(`/reviews/${reviewId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    return { id: Number(reviewId) }
  },

  // ---------- recommendations ----------
  async getBoughtTogether(productId) {
    return request(`/products/${productId}/bought-together`)
  },

  async bulkUpdateStock(updates) {
    return request('/products/bulk-stock', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    })
  },

  // ---------- promo codes ----------
  async validatePromo(code, subtotal) {
    return request('/promo/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    })
  },

  async getPromoCodes() {
    return request('/promoCodes?_sort=id&_order=desc')
  },

  async createPromoCode(payload) {
    return request('/promoCodes', { method: 'POST', body: JSON.stringify(payload) })
  },

  async updatePromoCode(id, payload) {
    return request(`/promoCodes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  async deletePromoCode(id) {
    await request(`/promoCodes/${id}`, { method: 'DELETE' })
    return { id: Number(id) }
  },

  // ---------- hero banners ----------
  async getBanners() {
    const banners = await request('/banners')
    return [...banners].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
  },

  async createBanner(payload) {
    return request('/banners', { method: 'POST', body: JSON.stringify(payload) })
  },

  async updateBanner(id, payload) {
    return request(`/banners/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  async deleteBanner(id) {
    await request(`/banners/${id}`, { method: 'DELETE' })
    return { id: Number(id) }
  },

  async getUsers() {
    const users = await request('/users')
    return users.map((user) => {
      const safeUser = { ...user }
      delete safeUser.password
      return safeUser
    })
  },

  async deleteUser(id) {
    await request(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return { id: Number(id) }
  },
}

export default api
