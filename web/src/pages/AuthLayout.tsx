import type { ReactNode } from 'react'
import { Link } from 'react-router'

// Moldura comum das telas de login e cadastro
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-50 text-brand-900">
      <header className="px-4 py-3 md:px-8">
        <Link to="/" className="text-xl font-bold">
          ♻ Recicla+
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-10 md:items-center md:pt-0">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  )
}
