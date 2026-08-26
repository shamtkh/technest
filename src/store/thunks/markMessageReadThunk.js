import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const markMessageReadThunk = createAsyncThunk(
  'chat/markMessageRead',
  async (messageId, { rejectWithValue }) => {
    try {
      return await api.markMessageRead(messageId)
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
