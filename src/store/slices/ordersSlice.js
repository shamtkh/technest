import { createSlice } from '@reduxjs/toolkit'
import { createOrderThunk } from '../thunks/ordersThunk'
import { getMyOrdersThunk } from '../thunks/getMyOrdersThunk'
import { getAllOrdersThunk } from '../thunks/getAllOrdersThunk'
import { updateOrderStatusThunk } from '../thunks/updateOrderStatusThunk'
import { deleteOrderThunk } from '../thunks/deleteOrderThunk'

const initialState = {
  items: [],
  lastOrder: null,
  status: 'idle',
  error: null,
  newOrdersCount: 0,
  lastCheckedAt: null,
  ordersInitialized: false,
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearLastOrder(state) {
      state.lastOrder = null
    },
    resetNewOrdersCount(state) {
      state.newOrdersCount = 0
      state.lastCheckedAt = new Date().toISOString()
    },
  },
  extraReducers: (builder) => {
    builder
      // createOrder
      .addCase(createOrderThunk.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createOrderThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.lastOrder = action.payload
        state.items.unshift(action.payload)
      })
      .addCase(createOrderThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'error'
      })
      // getMyOrders
      .addCase(getMyOrdersThunk.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(getMyOrdersThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(getMyOrdersThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'error'
      })
      // getAllOrders (admin)
      .addCase(getAllOrdersThunk.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(getAllOrdersThunk.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const previousIds = new Set(state.items.map((order) => order.id))
        state.items = action.payload
        if (!state.ordersInitialized) {
          state.ordersInitialized = true
          state.newOrdersCount = 0
        } else {
          const newPendingOrders = action.payload.filter(
            (order) => order.status === 'pending' && !previousIds.has(order.id)
          ).length
          if (newPendingOrders > 0) {
            state.newOrdersCount += newPendingOrders
          }
        }
      })
      .addCase(getAllOrdersThunk.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'error'
      })
      // updateOrderStatus (admin)
      .addCase(updateOrderStatusThunk.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.items.findIndex((o) => o.id === updated.id)
        if (idx !== -1) state.items[idx] = updated
      })
      .addCase(deleteOrderThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((order) => order.id !== action.payload.id)
      })
  },
})

export const { clearLastOrder, resetNewOrdersCount } = ordersSlice.actions
export default ordersSlice.reducer
