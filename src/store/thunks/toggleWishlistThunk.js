import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'
import { setWishlist, toggleWishlist } from '../slices/wishlistSlice'

// Local-first toggle: the heart always responds and the list is persisted in
// the browser. Logged-in customers also get it saved to their account so it
// follows them across devices; if that sync fails (offline, API hiccup) the
// local change is kept and merged into the account on the next sign-in.
export const toggleWishlistThunk = createAsyncThunk(
  'wishlist/toggle',
  async (productId, { dispatch, getState }) => {
    dispatch(toggleWishlist(productId))
    const user = getState().auth.user
    if (!user || user.role === 'admin') return { ids: getState().wishlist.ids, synced: false }
    try {
      const saved = await api.updateWishlist(user.id, getState().wishlist.ids)
      dispatch(setWishlist(saved))
      return { ids: saved, synced: true }
    } catch (err) {
      console.warn('Wishlist sync failed, kept locally:', err.message)
      return { ids: getState().wishlist.ids, synced: false }
    }
  }
)
