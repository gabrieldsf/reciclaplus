import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

// Protege rotas: sem sessão, redireciona para o login e volta depois
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="p-6 text-center text-brand-700">Carregando…</p>
  }
  if (!user) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
