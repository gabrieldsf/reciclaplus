import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { InstallAppButton } from '../components/InstallAppButton'
import { UserAvatar } from '../components/UserAvatar'
import { api } from '../lib/api'
import { categoryStyle } from '../lib/categories'
import type { PlatformStats } from '../lib/types'

const categories = ['Papel / Papelão', 'Plástico', 'Metal', 'Vidro', 'Eletrônicos', 'Doação']

const steps = [
  {
    icon: '📍',
    title: 'Informe',
    text: 'Marque no mapa onde está o material ou a doação, com categoria e quantidade.',
  },
  {
    icon: '🙋',
    title: 'Alguém assume',
    text: 'Quem coleta encontra perto de si e reserva a coleta com um toque.',
  },
  {
    icon: '♻️',
    title: 'Novo destino',
    text: 'O material é coletado e ganha uma nova vida, em vez de ir para o lixo.',
  },
]

// Ícones das categorias orbitando o logo (decorativo)
const orbit = [
  { name: 'Papel / Papelão', className: 'top-2 left-1/2 -translate-x-1/2' },
  { name: 'Plástico', className: 'top-1/4 right-0' },
  { name: 'Metal', className: 'right-2 bottom-1/4' },
  { name: 'Vidro', className: 'bottom-0 left-1/2 -translate-x-1/2' },
  { name: 'Eletrônicos', className: 'bottom-1/4 left-2' },
  { name: 'Doação', className: 'top-1/4 left-0' },
]

function HeroArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto size-64 md:size-80">
      <div className="absolute inset-6 rounded-full bg-brand-100" />
      <div className="absolute inset-14 rounded-full bg-white shadow-xl md:inset-16" />
      <img src="/logo.svg" alt="" className="absolute inset-0 m-auto size-24 md:size-28" />
      {orbit.map(({ name, className }) => {
        const { emoji, color } = categoryStyle(name)
        return (
          <span
            key={name}
            className={`absolute grid size-12 place-items-center rounded-2xl text-2xl shadow-md ring-4 ring-white md:size-14 ${className}`}
            style={{ backgroundColor: color }}
          >
            {emoji}
          </span>
        )
      })}
    </div>
  )
}

function useStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  useEffect(() => {
    let active = true
    // Números são um bônus: se a API falhar, a seção simplesmente não aparece
    api<PlatformStats>('/stats')
      .then((data) => active && setStats(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return stats
}

export function LandingPage() {
  const { user } = useAuth()
  const stats = useStats()

  return (
    <div className="min-h-dvh bg-brand-50 text-brand-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <span className="flex items-center gap-2 text-xl font-bold">
          <img src="/logo.svg" alt="" className="size-9" />
          Recicla+
        </span>
        {user ? (
          <Link
            to="/perfil"
            className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 font-medium hover:bg-brand-100"
          >
            Olá, {user.name.split(' ')[0]}
            <UserAvatar user={user} size="sm" />
          </Link>
        ) : (
          <Link to="/entrar" className="rounded-lg px-3 py-2 font-semibold hover:bg-brand-100">
            Entrar
          </Link>
        )}
      </header>

      <main>
        {/* Destaque */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 size-72 rounded-full bg-brand-100/70 blur-2xl"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pt-6 pb-12 md:grid-cols-2 md:px-8 md:pt-12 md:pb-20">
            <div className="flex flex-col gap-5 text-center md:text-left">
              <span className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 shadow-sm md:mx-0">
                ♻️ Reciclagem perto de você
              </span>
              <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-balance md:text-6xl">
                Encontre, compartilhe e <span className="text-brand-500">recicle</span>
              </h1>
              <p className="mx-auto max-w-md text-lg text-pretty text-brand-700 md:mx-0">
                Conectamos quem tem materiais recicláveis a quem pode coletá-los.
              </p>
              <div className="mx-auto flex w-full max-w-sm flex-col gap-3 sm:flex-row md:mx-0">
                <Link
                  to="/mapa"
                  className="flex-1 rounded-xl bg-brand-700 px-6 py-3 text-center font-semibold text-white shadow-sm hover:bg-brand-900"
                >
                  Explorar mapa
                </Link>
                <Link
                  to={user ? '/coletar' : '/cadastro'}
                  className="flex-1 rounded-xl border-2 border-brand-700 bg-white px-6 py-3 text-center font-semibold hover:bg-brand-100"
                >
                  {user ? 'Quero coletar' : 'Criar conta'}
                </Link>
              </div>
              <InstallAppButton className="mx-auto w-full max-w-sm md:mx-0" />
            </div>
            <HeroArt />
          </div>
        </section>

        {/* Números reais da plataforma */}
        {stats && stats.occurrences.total > 0 && (
          <section aria-label="Números do Recicla+" className="bg-brand-900 text-white">
            <dl className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-4 py-6 text-center md:px-8">
              {[
                { value: stats.occurrences.total, label: 'ocorrências registradas' },
                { value: stats.occurrences.COLLECTED, label: 'coletas concluídas' },
                {
                  value: stats.participants.people + stats.participants.companies,
                  label: 'participantes',
                },
              ].map(({ value, label }) => (
                // Número em cima, rótulo embaixo; justify-end (= topo, na coluna invertida)
                // mantém os números alinhados mesmo quando um rótulo quebra em 2 linhas
                <div key={label} className="flex flex-col-reverse justify-end">
                  <dt className="text-xs leading-tight text-brand-100 md:text-sm">{label}</dt>
                  <dd className="text-2xl font-extrabold tabular-nums md:text-4xl">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Como funciona */}
        <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">Como funciona</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-col"
              >
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-2xl"
                >
                  {step.icon}
                </span>
                <div>
                  <h3 className="font-bold">
                    <span className="text-brand-700">{index + 1}.</span> {step.title}
                  </h3>
                  <p className="text-sm text-brand-700">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Categorias */}
        <section className="mx-auto max-w-6xl px-4 pb-12 md:px-8 md:pb-16">
          <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">
            O que você pode informar
          </h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((name) => {
              const { emoji, color } = categoryStyle(name)
              return (
                <li
                  key={name}
                  className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 font-medium shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-8 place-items-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    {emoji}
                  </span>
                  {name}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Chamada final */}
        <section className="px-4 pb-12 md:px-8 md:pb-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-3xl bg-brand-700 px-6 py-10 text-center text-white shadow-lg">
            <h2 className="text-2xl font-bold text-balance md:text-3xl">
              Tem algo para descartar ou doar?
            </h2>
            <p className="max-w-md text-brand-100">
              Informe em poucos toques e alguém perto de você dá um novo destino ao material.
            </p>
            <Link
              to="/informar"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-900 hover:bg-brand-50"
            >
              + Informar agora
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-100 px-4 py-6 text-center text-sm text-brand-700">
        © 2026 Recicla+
      </footer>
    </div>
  )
}
