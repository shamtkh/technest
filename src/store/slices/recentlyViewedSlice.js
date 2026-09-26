import { createSlice } from '@reduxjs/toolkit'

const MAX_RECENT = 12

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState: { ids: [] },
  reducers: {
    addViewed(state, action) {
      const id = Number(action.payload)
      state.ids = [id, ...state.ids.filter((item) => item !== id)].slice(0, MAX_RECENT)
    },
    clearViewed(state) {
      state.ids = []
    },
  },
})

export const { addViewed, clearViewed } = recentlyViewedSlice.actions
export default recentlyViewedSlice.reducer
