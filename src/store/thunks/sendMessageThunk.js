import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const sendMessageThunk = createAsyncThunk(
  'chat/send',
  async ({ userId, userName, sender, text }, { rejectWithValue }) => {
    try {
      return await api.sendMessage({ userId, userName, sender, text })
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
