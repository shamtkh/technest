import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const getAllMessagesThunk = createAsyncThunk(
  'chat/getAll',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getAllMessages()
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
