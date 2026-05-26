// frontend/src/shared/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
