import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { OccurrenceForm } from '../components/occurrences/OccurrenceForm'
import { PageHeader } from '../components/PageHeader'
import { useOccurrence } from '../hooks/useOccurrence'
import { api } from '../lib/api'
import type { Occurrence, OccurrenceInput } from '../lib/types'

export function EditOccurrencePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { occurrence, loading, error } = useOccurrence(id)

  async function handleSubmit(input: OccurrenceInput) {
    await api<{ occurrence: Occurrence }>(`/occurrences/${id}`, { method: 'PATCH', body: input })
    navigate(`/ocorrencias/${id}`, { replace: true })
  }

  let blocked = ''
  if (error) blocked = error
  else if (occurrence && occurrence.user.id !== user?.id)
    blocked = 'Somente quem registrou a ocorrência pode editá-la.'
  else if (occurrence && occurrence.status !== 'AVAILABLE')
    blocked = 'Somente ocorrências disponíveis podem ser editadas.'

  return (
    <section className="mx-auto max-w-lg p-4 md:p-8">
      <PageHeader title="Editar ocorrência" />
      {loading && <p className="text-brand-700">Carregando…</p>}
      {blocked && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {blocked}{' '}
          <Link to={`/ocorrencias/${id}`} className="font-semibold underline">
            Voltar aos detalhes
          </Link>
        </p>
      )}
      {occurrence && !blocked && (
        <OccurrenceForm
          initialValues={{
            categoryId: occurrence.category.id,
            subcategoryId: occurrence.subcategory?.id ?? null,
            estimatedQuantity: occurrence.estimatedQuantity ?? '',
            description: occurrence.description ?? '',
            location: { latitude: occurrence.latitude, longitude: occurrence.longitude },
            // A URL da foto termina com o id dela (/api/photos/<id>)
            photo: occurrence.photoUrl
              ? { id: occurrence.photoUrl.split('/').pop()!, url: occurrence.photoUrl }
              : null,
          }}
          submitLabel="Salvar alterações"
          submittingLabel="Salvando…"
          onSubmit={handleSubmit}
        />
      )}
    </section>
  )
}
