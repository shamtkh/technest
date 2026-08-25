import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const deleteOrderThunk = createAsyncThunk(
  'orders/delete',
  async (orderId, { rejectWithValue }) => {
    try {
      return await api.deleteOrder(orderId)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)