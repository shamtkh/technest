import { createSlice } from '@reduxjs/toolkit'
import { loginThunk } from '../thunks/loginThunk'
import { registerThunk } from '../thunks/registerThunk'

const initialState = {
  user: null,
  status: 'idle',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      // Profile updates come back from the API without the session token
      // (unless a password change issued a new one); keep the current one.
      state.user = action.payload && { token: state.user?.token, ...action.payload }
    },
    logout(state) {
      state.user = null
      state.status = 'idle'
      state.error = null
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'error'
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'error'
      })
  },
})

export const { setUser, logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
