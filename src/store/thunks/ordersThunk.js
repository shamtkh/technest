import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const createOrderThunk = createAsyncThunk(
  'orders/create',
  async (order, { rejectWithValue }) => {
    try {
      return await api.createOrder(order)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
