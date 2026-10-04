import { useAuth } from '../auth/AuthContext'
import { AvatarPicker } from '../components/AvatarPicker'
import { InstallAppButton } from '../components/InstallAppButton'

const userTypeLabels = { PERSON: 'Pessoa', COMPANY: 'Empresa', ADMIN: 'Administrador' } as const

export function ProfilePage() {
  const { user, logout } = useAuth()

  // RequireAuth garante que há usuário nesta rota
  if (!user) return null

  return (
    <section className="mx-auto max-w-md p-4 md:p-8">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <div className="mt-6">
        <AvatarPicker />
      </div>
      <dl className="mt-4 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <dt className="text-sm text-brand-700">Nome</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-brand-700">E-mail</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-brand-700">Tipo de conta</dt>
          <dd className="font-medium">{userTypeLabels[user.userType]}</dd>
        </div>
      </dl>
      <InstallAppButton className="mt-6 w-full" />
      <button
        type="button"
        // RequireAuth leva para a página inicial após sair
        onClick={logout}
        className="mt-6 w-full rounded-xl border-2 border-red-700 px-6 py-3 font-semibold text-red-700 hover:bg-red-50"
      >
        Sair
      </button>
    </section>
  )
}
