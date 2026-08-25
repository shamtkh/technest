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
}

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProductsThunk.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(getProductsThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(getProductsThunk.rejected, (state, action) => {
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
