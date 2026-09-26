import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'
import { mergeWishlist } from './mergeWishlist'

export const registerThunk = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { getState, rejectWithValue }) => {
    try {
      const user = await api.register({ name, email, password })
      return await mergeWishlist(user, getState().wishlist?.ids || [])
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
