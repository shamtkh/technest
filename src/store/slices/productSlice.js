import { createSlice } from '@reduxjs/toolkit'
import { getProductsThunk } from '../thunks/getProductsThunk'
import { createProductThunk } from '../thunks/createProductThunk'
import { updateProductThunk } from '../thunks/updateProductThunk'
import { deleteProductThunk } from '../thunks/deleteProductThunk'

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  mutationStatus: 'idle',
  fetching: false,
  lastFetchedAt: null,
}

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Background refreshes don't flip status to 'loading' once items exist,
      // so pages don't re-render (or flash skeletons) on every poll.
      .addCase(getProductsThunk.pending, (state) => {
        state.fetching = true
        if (!state.items.length) state.status = 'loading'
      })
      .addCase(getProductsThunk.fulfilled, (state, action) => {
        state.fetching = false
        state.lastFetchedAt = Date.now()
        state.status = 'succeeded'
        if (action.payload.changed) state.items = action.payload.items
      })
      .addCase(getProductsThunk.rejected, (state, action) => {
        state.fetching = false
        state.status = 'failed'
        state.error = action.payload || 'error'
      })
      .addCase(createProductThunk.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
        state.mutationStatus = 'succeeded'
      })
      .addCase(updateProductThunk.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        state.mutationStatus = 'succeeded'
      })
      .addCase(deleteProductThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload.id)
        state.mutationStatus = 'succeeded'
      })
  },
})

export default productSlice.reducer
