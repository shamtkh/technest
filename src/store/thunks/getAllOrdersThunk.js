import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const getAllOrdersThunk = createAsyncThunk(
  'orders/getAll',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getAllOrders()
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
