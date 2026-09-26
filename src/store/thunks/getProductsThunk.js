import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

// Pages mount-fetch and poll the catalog; skip a request if one is already in
// flight or the data is only a few seconds old (e.g. right after navigating
// from another page). Pass { force: true } after a mutation that changed stock
// or ratings.
const FRESH_MS = 10000

export const getProductsThunk = createAsyncThunk(
  'products/getAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const fresh = await api.getProducts()
      // Keep the previous object for every product that didn't change, and the
      // previous array if nothing changed at all, so memoized cards and
      // selectors don't re-render on every poll.
      const previous = getState().products.items
      const byId = new Map(previous.map((product) => [product.id, product]))
      let changed = fresh.length !== previous.length
      const items = fresh.map((product, index) => {
        const old = byId.get(product.id)
        if (old && JSON.stringify(old) === JSON.stringify(product)) {
          if (previous[index] !== old) changed = true
          return old
        }
        changed = true
        return product
      })
      return { items, changed }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  },
  {
    condition: (arg, { getState }) => {
      const { fetching, lastFetchedAt } = getState().products
      if (fetching) return false
      if (!arg?.force && lastFetchedAt && Date.now() - lastFetchedAt < FRESH_MS) return false
      return true
    },
  }
)
