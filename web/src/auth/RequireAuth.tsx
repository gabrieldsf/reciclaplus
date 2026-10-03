import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

// Protege rotas: sem sessão, redireciona para o login e volta depois.
// Quem acabou de clicar em "Sair" vai para a página inicial.
export function RequireAuth() {
  const { user, loading, loggedOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="p-6 text-center text-brand-700">Carregando…</p>
  }
  if (!user) {
    if (loggedOut) return <Navigate to="/" replace />
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
