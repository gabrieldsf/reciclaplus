import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import type { RegisterData } from '../auth/AuthContext'
import { TextField } from '../components/TextField'
import { ApiError } from '../lib/api'
import { suggestEmail } from '../lib/email-suggest'
import { AuthLayout } from './AuthLayout'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userType, setUserType] = useState<RegisterData['userType']>('PERSON')
  const [email, setEmail] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/mapa'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setFieldErrors({})
    setSubmitting(true)
    try {
      await register({
        name: String(form.get('name')),
        email,
        password: String(form.get('password')),
        userType,
      })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        setFieldErrors(Object.fromEntries(err.fieldErrors.map((e) => [e.field, e.message])))
      } else {
        setError(err instanceof ApiError ? err.message : 'Erro inesperado')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Criar conta">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm font-medium">Tipo de conta</legend>
          {(
            [
              ['PERSON', 'Pessoa'],
              ['COMPANY', 'Empresa'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-2 font-medium has-checked:border-brand-700 has-checked:bg-brand-100 has-focus-visible:ring-2 has-focus-visible:ring-brand-500/40"
            >
              <input
                type="radio"
                name="userType"
                value={value}
                checked={userType === value}
                onChange={() => setUserType(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <TextField
          label={userType === 'COMPANY' ? 'Nome da empresa' : 'Nome'}
          name="name"
          autoComplete={userType === 'COMPANY' ? 'organization' : 'name'}
          required
          error={fieldErrors['name']}
        />
        <div className="flex flex-col gap-1">
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailSuggestion(null)
            }}
            // Sugere a correção ao sair do campo: "gmial.com" → "gmail.com"
            onBlur={() => setEmailSuggestion(suggestEmail(email))}
            error={fieldErrors['email']}
          />
          {emailSuggestion && (
            <p className="text-sm text-amber-800">
              Você quis dizer{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail(emailSuggestion)
                  setEmailSuggestion(null)
                }}
                className="font-semibold underline"
              >
                {emailSuggestion}
              </button>
              ?
            </p>
          )}
        </div>
        <TextField
          label="Senha (mínimo 8 caracteres)"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          error={fieldErrors['password']}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        Já tem conta?{' '}
        <Link
          to="/entrar"
          state={location.state}
          className="font-semibold text-brand-700 underline"
        >
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
