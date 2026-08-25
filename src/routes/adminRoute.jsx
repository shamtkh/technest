import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function AdminRoute() {
  const user = useSelector((state) => state.auth.user)

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/forbidden" replace />

  return <Outlet />
}
