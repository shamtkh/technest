import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const getMyMessagesThunk = createAsyncThunk(
  'chat/getMine',
  async (userId, { rejectWithValue }) => {
    try {
      return await api.getMyMessages(userId)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
