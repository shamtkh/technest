import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'
import { mergeWishlist } from './mergeWishlist'

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { getState, rejectWithValue }) => {
    try {
      const user = await api.login(email, password)
      return await mergeWishlist(user, getState().wishlist?.ids || [])
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
