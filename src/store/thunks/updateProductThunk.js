import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const updateProductThunk = createAsyncThunk(
  'products/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await api.updateProduct(id, payload)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
