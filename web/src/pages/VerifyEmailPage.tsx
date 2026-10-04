import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import type { User } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { AuthLayout } from './AuthLayout'

const RESEND_SECONDS = 60

// Tela "Confirme seu e-mail": digitar o código de 6 dígitos recebido por e-mail
export function VerifyEmailPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // O cadastro acabou de enviar um código: o reenvio libera depois de 60 s
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/mapa'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  if (!user) return null
  if (user.emailVerified) return <Navigate to={redirectTo} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setInfo('')
    if (!/^\d{6}$/.test(code)) {
      setError('Digite os 6 números do código')
      return
    }
    setSubmitting(true)
    try {
      const res = await api<{ user: User }>('/auth/verify-email', {
        method: 'POST',
        body: { code },
      })
      updateUser(res.user)
      navigate(redirectTo, { replace: true, state: { verified: true } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setInfo('')
    try {
      await api('/auth/verify-email/resend', { method: 'POST' })
      setInfo('Enviamos um novo código. Confira também a caixa de spam.')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado')
    }
  }

  return (
    <AuthLayout title="Confirme seu e-mail">
      <p className="mb-5 text-brand-700">
        Enviamos um código de 6 números para{' '}
        <strong className="text-brand-900">{user.email}</strong>. Ele vale por 15 minutos.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="text-sm font-medium">
            Código
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'code-error' : undefined}
            placeholder="000000"
            className="rounded-lg border border-brand-700/30 bg-white px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-500/30 aria-invalid:border-red-600"
          />
        </div>

        {error && (
          <p
            id="code-error"
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {submitting ? 'Confirmando…' : 'Confirmar'}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 text-sm">
        <p className="text-brand-700">Não recebeu? Confira a caixa de spam.</p>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={cooldown > 0}
          className="font-semibold text-brand-700 underline disabled:no-underline disabled:opacity-60"
        >
          {cooldown > 0 ? `Reenviar código em ${cooldown} s` : 'Reenviar código'}
        </button>
        <Link to={redirectTo} className="text-brand-700 underline">
          Confirmar depois
        </Link>
      </div>
    </AuthLayout>
  )
}
