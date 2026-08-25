import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const getProductsThunk = createAsyncThunk('products/getAll', async (_, { rejectWithValue }) => {
  try {
    return await api.getProducts()
  } catch (err) {
    return rejectWithValue(err.message)
  }
})
