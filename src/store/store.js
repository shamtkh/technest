import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storageModule from 'redux-persist/lib/storage'

import authReducer from './slices/authSlice'
import productReducer from './slices/productSlice'
import ordersReducer from './slices/ordersSlice'
import cartReducer from './slices/cartSlice'
import chatReducer from './slices/chatSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  products: productReducer,
  orders: ordersReducer,
  cart: cartReducer,
  chat: chatReducer,
})

const persistConfig = {
  key: 'technest_root',
  storage: storageModule.default ?? storageModule,
  whitelist: ['auth', 'cart'],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)
