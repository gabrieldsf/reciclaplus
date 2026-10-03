import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { InstallAppButton } from '../components/InstallAppButton'

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-brand-50 text-brand-900">
      <header className="flex items-center justify-between px-4 py-3 md:px-8">
        <span className="text-xl font-bold">♻ Recicla+</span>
        {user ? (
          <Link to="/perfil" className="rounded-lg px-3 py-2 font-medium hover:bg-brand-100">
            Olá, {user.name.split(' ')[0]}
          </Link>
        ) : (
          <Link to="/entrar" className="rounded-lg px-3 py-2 font-medium hover:bg-brand-100">
            Entrar
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-4xl leading-tight font-extrabold md:text-6xl">
          Encontre. Compartilhe.
          <br />
          Recicle.
        </h1>
        <p className="max-w-md text-lg text-brand-700">
          Conectando materiais recicláveis a quem pode coletá-los.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            to="/mapa"
            className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900"
          >
            Explorar mapa
          </Link>
          {!user && (
            <Link
              to="/cadastro"
              className="rounded-xl border-2 border-brand-700 px-6 py-3 font-semibold hover:bg-brand-100"
            >
              Criar conta
            </Link>
          )}
          <InstallAppButton />
        </div>
      </main>
    </div>
  )
}
