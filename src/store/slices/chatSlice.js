import { createSlice } from '@reduxjs/toolkit'
import { getMyMessagesThunk } from '../thunks/getMyMessagesThunk'
import { getAllMessagesThunk } from '../thunks/getAllMessagesThunk'
import { sendMessageThunk } from '../thunks/sendMessageThunk'

const initialState = {
  myMessages: [],
  myStatus: 'idle',
  myError: null,
  myUnreadCount: 0,
  myInitialized: false,

  allMessages: [],
  allStatus: 'idle',
  allError: null,
  adminUnreadCount: 0,
  allInitialized: false,
}

function getSeenMessageIds(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`technest_seen_support_${userId}`) || '[]'))
  } catch {
    return new Set()
  }
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    resetMyUnreadCount(state) {
      state.myUnreadCount = 0
    },
    markMyMessagesRead(state) {
      state.myUnreadCount = 0
    },
    resetAdminUnreadCount(state) {
      state.adminUnreadCount = 0
    },
  },
  extraReducers: (builder) => {
    builder
      // getMyMessages (customer widget)
      .addCase(getMyMessagesThunk.pending, (state) => {
        state.myStatus = 'loading'
      })
      .addCase(getMyMessagesThunk.fulfilled, (state, action) => {
        state.myStatus = 'succeeded'
        state.myMessages = action.payload
        const userId = action.payload[0]?.userId
        const seenIds = userId === undefined ? new Set() : getSeenMessageIds(userId)
        state.myUnreadCount = action.payload.filter(
          (message) => message.sender === 'admin' && !seenIds.has(message.id)
        ).length
        state.myInitialized = true
      })
      .addCase(getMyMessagesThunk.rejected, (state, action) => {
        state.myStatus = 'failed'
        state.myError = action.payload || 'error'
      })
      // getAllMessages (admin support tab)
      .addCase(getAllMessagesThunk.pending, (state) => {
        state.allStatus = 'loading'
      })
      .addCase(getAllMessagesThunk.fulfilled, (state, action) => {
        state.allStatus = 'succeeded'
        const previousIds = new Set(state.allMessages.map((m) => m.id))
        state.allMessages = action.payload
        if (!state.allInitialized) {
          state.allInitialized = true
        } else {
          const newUserMessages = action.payload.filter(
            (m) => m.sender === 'user' && !previousIds.has(m.id)
          ).length
          if (newUserMessages > 0) state.adminUnreadCount += newUserMessages
        }
      })
      .addCase(getAllMessagesThunk.rejected, (state, action) => {
        state.allStatus = 'failed'
        state.allError = action.payload || 'error'
      })
      // sendMessage
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        const msg = action.payload
        if (msg.sender === 'user') state.myMessages.push(msg)
        else state.allMessages.push(msg)
      })
  },
})

export const { resetMyUnreadCount, markMyMessagesRead, resetAdminUnreadCount } = chatSlice.actions
export default chatSlice.reducer
