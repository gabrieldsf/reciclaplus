import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/mapa', label: 'Mapa', icon: '🗺️' },
  { to: '/painel', label: 'Painel', icon: '📊' },
  { to: '/informar', label: 'Informar', icon: '➕' },
  { to: '/historico', label: 'Histórico', icon: '🕘' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

// Mobile: navegação na barra inferior. Desktop: navegação no topo.
// A página ocupa exatamente a altura da tela; o conteúdo rola dentro do <main>.
export function AppLayout() {
  const { user } = useAuth()

  return (
    <div className="flex h-dvh flex-col bg-brand-50 text-brand-900">
      <header className="flex shrink-0 items-center justify-between border-b border-brand-100 bg-white px-4 py-3 md:px-8">
        <Link to="/" className="text-lg font-bold">
          ♻ Recicla+
        </Link>
        <nav aria-label="Navegação principal" className="hidden gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-medium ${isActive ? 'bg-brand-100' : 'hover:bg-brand-50'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {!user && (
          <Link
            to="/entrar"
            className="rounded-lg px-3 py-2 font-medium hover:bg-brand-100 md:ml-2"
          >
            Entrar
          </Link>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav
        aria-label="Navegação principal"
        className="grid shrink-0 grid-cols-5 border-t border-brand-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${isActive ? 'text-brand-700' : 'text-brand-900/60'}`
            }
          >
            <span aria-hidden="true" className="text-xl">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
