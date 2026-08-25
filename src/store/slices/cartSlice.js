import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: [], // { key, productId, name, image, price, qty, storage, color }
}

function makeKey(productId, storage, color) {
  return `${productId}__${storage || ''}__${color || ''}`
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action) {
      const { productId, name, image, price, storage, color, qty = 1, stock } = action.payload
      const key = makeKey(productId, storage, color)
      const existing = state.items.find((i) => i.key === key)
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, stock ?? 99)
      } else {
        state.items.push({ key, productId, name, image, price, storage, color, qty, stock })
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.key !== action.payload)
    },
    incrementQty(state, action) {
      const item = state.items.find((i) => i.key === action.payload)
      if (item) item.qty = Math.min(item.qty + 1, item.stock ?? 99)
    },
    decrementQty(state, action) {
      const item = state.items.find((i) => i.key === action.payload)
      if (item && item.qty > 1) item.qty -= 1
    },
    clearCart(state) {
      state.items = []
    },
  },
})

export const { addItem, removeItem, incrementQty, decrementQty, clearCart } = cartSlice.actions
export default cartSlice.reducer
