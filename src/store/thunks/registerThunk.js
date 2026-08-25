import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const registerThunk = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      return await api.register({ name, email, password })
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
