import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const getMyOrdersThunk = createAsyncThunk(
  'orders/getMine',
  async (userId, { rejectWithValue }) => {
    try {
      return await api.getMyOrders(userId)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
