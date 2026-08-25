import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      return await api.login(email, password)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
