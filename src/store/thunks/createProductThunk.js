import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const createProductThunk = createAsyncThunk(
  'products/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await api.createProduct(payload)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
