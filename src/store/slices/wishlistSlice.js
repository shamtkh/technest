import { createSlice } from '@reduxjs/toolkit'
import { loginThunk } from '../thunks/loginThunk'
import { registerThunk } from '../thunks/registerThunk'
import { logout } from './authSlice'

const initialState = {
  ids: [], // product ids, most recently added first
}

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlist(state, action) {
      const id = Number(action.payload)
      state.ids = state.ids.includes(id) ? state.ids.filter((item) => item !== id) : [id, ...state.ids]
    },
    setWishlist(state, action) {
      state.ids = action.payload.map(Number)
    },
  },
  extraReducers: (builder) => {
    // The login/register thunks merge the guest wishlist with the account's
    // saved one and return the result on the user object.
    builder
      .addCase(loginThunk.fulfilled, (state, action) => {
        if (Array.isArray(action.payload?.wishlist)) state.ids = action.payload.wishlist
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        if (Array.isArray(action.payload?.wishlist)) state.ids = action.payload.wishlist
      })
      .addCase(logout, () => initialState)
  },
})

export const { toggleWishlist, setWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
