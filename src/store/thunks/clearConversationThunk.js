import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const clearConversationThunk = createAsyncThunk(
  'chat/clearConversation',
  async (userId, { rejectWithValue }) => {
    try {
      await api.clearConversation(userId)
      return userId
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)
