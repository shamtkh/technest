import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Layout from './components/Layout'
import ProtectedRoute from './routes/protectedRoute'
import AdminRoute from './routes/adminRoute'

import HomePage from './pages/homePage'
import ProductsPage from './pages/ProductsPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/cartPage'
import CheckoutPage from './pages/checkoutPage'
import LoginPage from './pages/loginPage'
import RegisterPage from './pages/registerPage'
import OrdersPage from './pages/ordersPage'
import NotFoundPage from './pages/NotFoundPage'
import ForbiddenPage from './pages/forbiddenPage'
import ProfilePage from './pages/ProfilePage'
import WishlistPage from './pages/WishlistPage'
import { AdminDashboardSkeleton } from './components/Skeleton'

// Admin-only code (incl. chart.js) is split out so customers never download it.
const AdminPage = lazy(() => import('./pages/adminPage'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route
              path="admin"
              element={(
                <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><AdminDashboardSkeleton /></div>}>
                  <AdminPage />
                </Suspense>
              )}
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
