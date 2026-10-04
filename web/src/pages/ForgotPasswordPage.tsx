import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { TextField } from '../components/TextField'
import { api, ApiError } from '../lib/api'
import { AuthLayout } from './AuthLayout'

const RESEND_SECONDS = 60

// "Esqueci minha senha": 1) e-mail → 2) código recebido + senha nova (e já entra no app)
export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendCode(to: string) {
    await api('/auth/password/forgot', { method: 'POST', body: { email: to } })
    setSentTo(to)
    setCooldown(RESEND_SECONDS)
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      await sendCode(email.trim())
    } catch (err) {
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setInfo('')
    setFieldErrors({})
    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ code: 'Digite os 6 números do código' })
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(sentTo!, code, password)
      navigate('/mapa', { replace: true })
    } catch (err) {
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setInfo('')
    try {
      await sendCode(sentTo!)
      setInfo('Enviamos um novo código. Confira também a caixa de spam.')
    } catch (err) {
      showError(err)
    }
  }

  function showError(err: unknown) {
    if (err instanceof ApiError && err.fieldErrors.length > 0) {
      setFieldErrors(Object.fromEntries(err.fieldErrors.map((e) => [e.field, e.message])))
      // A mensagem geral (ex.: "Restam 4 tentativas") complementa o erro do campo
      if (err.fieldErrors.every((e) => e.message !== err.message)) setError(err.message)
    } else {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado')
    }
  }

  const alerts = (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {info}
        </p>
      )}
    </>
  )

  return (
    <AuthLayout title={sentTo ? 'Criar nova senha' : 'Esqueci minha senha'}>
      {!sentTo ? (
        <form onSubmit={handleRequest} className="flex flex-col gap-4" noValidate>
          <p className="text-brand-700">
            Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.
          </p>
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors['email']}
          />
          {alerts}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4" noValidate>
          <p className="text-brand-700">
            Se houver uma conta com <strong className="text-brand-900">{sentTo}</strong>, enviamos
            um código de 6 números. Ele vale por 15 minutos.
          </p>
          <TextField
            label="Código"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={fieldErrors['code']}
          />
          <TextField
            label="Nova senha"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors['password']}
          />
          {alerts}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
          >
            {submitting ? 'Salvando…' : 'Salvar nova senha'}
          </button>
          <div className="flex flex-col items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={cooldown > 0}
              className="font-semibold text-brand-700 underline disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Reenviar código em ${cooldown} s` : 'Reenviar código'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSentTo(null)
                setCode('')
                setError('')
                setInfo('')
              }}
              className="text-brand-700 underline"
            >
              Usar outro e-mail
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        Lembrou a senha?{' '}
        <Link to="/entrar" className="font-semibold text-brand-700 underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
