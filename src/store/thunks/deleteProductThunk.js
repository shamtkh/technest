import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const deleteProductThunk = createAsyncThunk(
  'products/delete',
  async (id, { rejectWithValue }) => {
    try {
      return await api.deleteProduct(id)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
