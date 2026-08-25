import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const updateOrderStatusThunk = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      return await api.updateOrderStatus(orderId, status)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
