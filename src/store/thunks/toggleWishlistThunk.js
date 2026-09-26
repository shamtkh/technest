import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'
import { setWishlist, toggleWishlist } from '../slices/wishlistSlice'

// Optimistic toggle; logged-in customers also get it saved to their account
// so the wishlist follows them across devices. Guests keep it locally.
export const toggleWishlistThunk = createAsyncThunk(
  'wishlist/toggle',
  async (productId, { dispatch, getState, rejectWithValue }) => {
    const previous = getState().wishlist.ids
    dispatch(toggleWishlist(productId))
    const user = getState().auth.user
    if (!user || user.role === 'admin') return getState().wishlist.ids
    try {
      const saved = await api.updateWishlist(user.id, getState().wishlist.ids)
      dispatch(setWishlist(saved))
      return saved
    } catch (err) {
      dispatch(setWishlist(previous))
      return rejectWithValue(err.message)
    }
  }
)
