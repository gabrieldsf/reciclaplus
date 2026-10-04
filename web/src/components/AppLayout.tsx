import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from './UserAvatar'

type NavItem = {
  to: string
  label: string
  icon: string
  // Ações principais do app ganham destaque visual
  variant?: 'primary' | 'accent'
}

const navItems: NavItem[] = [
  { to: '/mapa', label: 'Mapa', icon: '🗺️' },
  { to: '/painel', label: 'Painel', icon: '📊' },
  { to: '/informar', label: 'Informar', icon: '+', variant: 'primary' },
  { to: '/coletar', label: 'Coletar', icon: '🚚', variant: 'accent' },
  { to: '/historico', label: 'Histórico', icon: '🕘' },
]

// Desktop: links simples; "Coletar" e "Informar" viram botões
function desktopClasses(item: NavItem, isActive: boolean) {
  if (item.variant === 'primary') {
    return `rounded-full bg-brand-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-brand-900 ${isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`
  }
  if (item.variant === 'accent') {
    return `rounded-full border-2 border-brand-700 px-4 py-1.5 font-semibold hover:bg-brand-100 ${isActive ? 'bg-brand-100' : ''}`
  }
  return `rounded-lg px-3 py-2 font-medium ${isActive ? 'bg-brand-100' : 'hover:bg-brand-50'}`
}

// Mobile: navegação na barra inferior. Desktop: navegação no topo.
// A página ocupa exatamente a altura da tela; o conteúdo rola dentro do <main>.
export function AppLayout() {
  const { user } = useAuth()

  return (
    <div className="flex h-dvh flex-col bg-brand-50 text-brand-900">
      <header className="flex shrink-0 items-center justify-between border-b border-brand-100 bg-white px-4 py-2.5 md:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold">
          <img src="/logo.svg" alt="" className="size-8" />
          Recicla+
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${desktopClasses(item, isActive)} ${item.variant === 'accent' ? 'ml-2' : ''}`
              }
            >
              {item.variant === 'primary' && <span aria-hidden="true">+ </span>}
              {item.label}
            </NavLink>
          ))}
        </nav>
        {/* Perfil no canto superior direito (celular e desktop) */}
        {user ? (
          <NavLink
            to="/perfil"
            aria-label="Perfil"
            title={user.name}
            className={({ isActive }) =>
              `rounded-full md:ml-3 ${isActive ? 'ring-2 ring-brand-500 ring-offset-2' : 'hover:opacity-90'}`
            }
          >
            <UserAvatar user={user} />
          </NavLink>
        ) : (
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
        className="grid shrink-0 grid-cols-5 items-end border-t border-brand-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {navItems.map((item) =>
          item.variant === 'primary' ? (
            // Botão redondo elevado no centro da barra
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 pb-1.5 text-xs ${isActive ? 'font-bold text-brand-900' : 'font-semibold text-brand-900'}`
              }
            >
              <span
                aria-hidden="true"
                className="-mt-6 grid size-14 place-items-center rounded-full bg-brand-700 text-4xl leading-none font-light text-white shadow-lg ring-4 ring-white"
              >
                +
              </span>
              {item.label}
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                // Ativo: negrito + faixa no topo (não depende só da cor); inativo com contraste AA
                `flex flex-col items-center gap-0.5 border-t-[3px] py-2 text-xs ${isActive ? 'border-brand-700 font-bold text-brand-900' : 'border-transparent font-medium text-brand-700'}`
              }
            >
              <span
                aria-hidden="true"
                className={
                  item.variant === 'accent'
                    ? 'grid h-7 w-11 place-items-center rounded-full bg-brand-100 text-lg ring-1 ring-brand-500/40'
                    : 'text-xl'
                }
              >
                {item.icon}
              </span>
              <span className={item.variant === 'accent' ? 'font-bold text-brand-900' : ''}>
                {item.label}
              </span>
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}
