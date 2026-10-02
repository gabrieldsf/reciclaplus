import { useNavigate } from 'react-router'
import { OccurrenceForm } from '../components/occurrences/OccurrenceForm'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import type { Occurrence, OccurrenceInput } from '../lib/types'

export function CreateOccurrencePage() {
  const navigate = useNavigate()

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
      <OccurrenceForm
        submitLabel="Publicar ocorrência"
        submittingLabel="Publicando…"
        onSubmit={handleSubmit}
      />
    </section>
  )
}
