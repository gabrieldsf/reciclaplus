import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { OccurrenceForm } from '../components/occurrences/OccurrenceForm'
import { PageHeader } from '../components/PageHeader'
import { VerifyEmailLink } from '../components/VerifyEmailLink'
import { api } from '../lib/api'
import type { Occurrence, OccurrenceInput } from '../lib/types'

export function CreateOccurrencePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleSubmit(input: OccurrenceInput) {
    const { occurrence } = await api<{ occurrence: Occurrence }>('/occurrences', {
      method: 'POST',
      body: input,
    })
    navigate(`/ocorrencias/${occurrence.id}`, { replace: true, state: { created: true } })
  }

  return (
    <section className="mx-auto max-w-lg p-4 md:p-8">
      <PageHeader title="Informar reciclável" />
      {user && !user.emailVerified ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm">
          <span aria-hidden="true" className="text-4xl">
            ✉️
          </span>
          <p className="text-brand-700">
            Para informar um reciclável, confirme primeiro o seu e-mail com o código que enviamos.
          </p>
          <VerifyEmailLink className="rounded-xl bg-brand-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-900">
            Confirmar e-mail
          </VerifyEmailLink>
        </div>
      ) : (
        <OccurrenceForm
          submitLabel="Publicar ocorrência"
          submittingLabel="Publicando…"
          onSubmit={handleSubmit}
        />
      )}
    </section>
  )
}
