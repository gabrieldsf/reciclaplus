import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Marker } from 'react-leaflet'
import { useAuth } from '../auth/AuthContext'
import { BaseMap } from '../components/map/BaseMap'
import { categoryIcon } from '../components/map/markers'
import { CollectionPanel } from '../components/occurrences/CollectionPanel'
import { CollectorRoute } from '../components/occurrences/CollectorRoute'
import { StatusBadge } from '../components/occurrences/StatusBadge'
import { Timeline } from '../components/occurrences/Timeline'
import { PageHeader } from '../components/PageHeader'
import { UserAvatar } from '../components/UserAvatar'
import { useCurrentPosition } from '../hooks/useCurrentPosition'
import { useOccurrence } from '../hooks/useOccurrence'
import { api, ApiError } from '../lib/api'
import { categoryStyle } from '../lib/categories'
import { formatDateTime } from '../lib/format'
import { distanceKm, formatDistance } from '../lib/geo'
import type { Occurrence } from '../lib/types'

const userTypeLabels = { PERSON: 'Pessoa', COMPANY: 'Empresa', ADMIN: 'Administrador' } as const

export function OccurrenceDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { occurrence, loading, error, replace } = useOccurrence(id)
  const { position, locating, locate } = useCurrentPosition({ auto: true })
  const [actionError, setActionError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const justCreated = (location.state as { created?: boolean } | null)?.created

  async function handleCancel() {
    const collector = occurrence?.status === 'IN_COLLECTION' && occurrence.collection?.collector
    const message = collector
      ? `Cancelar esta ocorrência? ${collector.name} já assumiu a coleta e não poderá mais finalizá-la.`
      : 'Cancelar esta ocorrência? Ela deixará de aparecer no mapa.'
    if (!window.confirm(message)) return
    setActionError('')
    setCancelling(true)
    try {
      const res = await api<{ occurrence: Occurrence }>(`/occurrences/${id}/cancel`, {
        method: 'POST',
      })
      replace(res.occurrence)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro inesperado')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <p className="p-6 text-center text-brand-700">Carregando…</p>
  if (error || !occurrence) {
    return (
      <section className="mx-auto max-w-lg p-4 md:p-8">
        <PageHeader title="Ocorrência" />
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error || 'Ocorrência não encontrada'}
        </p>
      </section>
    )
  }

  const isOwner = user?.id === occurrence.user.id
  const { emoji, color } = categoryStyle(occurrence.category.name)
  const canEdit = isOwner && occurrence.status === 'AVAILABLE'
  const canCancel =
    isOwner && (occurrence.status === 'AVAILABLE' || occurrence.status === 'IN_COLLECTION')

  return (
    <section className="mx-auto max-w-lg p-4 md:p-8">
      <PageHeader title="Detalhes da ocorrência" />

      {justCreated && (
        <p role="status" className="mb-4 rounded-lg bg-green-100 px-3 py-2 text-green-800">
          Ocorrência publicada! Ela já aparece no mapa.
        </p>
      )}

      <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <BaseMap
          center={occurrence}
          zoom={16}
          className="h-48"
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomControl={false}
          keyboard={false}
        >
          <Marker
            position={[occurrence.latitude, occurrence.longitude]}
            icon={categoryIcon(occurrence.category.name)}
            alt={occurrence.category.name}
          />
        </BaseMap>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: color }}
              >
                {emoji}
              </span>
              <span>
                {occurrence.category.name}
                {occurrence.subcategory && (
                  <span className="block text-sm font-medium text-brand-700">
                    {occurrence.subcategory.name}
                  </span>
                )}
              </span>
            </h2>
            <StatusBadge status={occurrence.status} />
          </div>

          {occurrence.photoUrl && (
            <img
              src={occurrence.photoUrl}
              alt={`Foto do material: ${occurrence.category.name}`}
              className="max-h-72 w-full rounded-lg object-cover"
            />
          )}

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-brand-700">Quantidade estimada</dt>
              <dd className="font-medium">{occurrence.estimatedQuantity || 'Não informada'}</dd>
            </div>
            <div>
              <dt className="text-brand-700">Distância</dt>
              <dd className="font-medium">
                {position ? (
                  `${formatDistance(distanceKm(position, occurrence))} de você`
                ) : (
                  <button
                    type="button"
                    onClick={() => void locate()}
                    disabled={locating}
                    className="font-medium text-brand-700 underline"
                  >
                    {locating ? 'Calculando…' : 'Calcular'}
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-brand-700">Registrada em</dt>
              <dd className="font-medium">{formatDateTime(occurrence.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-brand-700">Informada por</dt>
              <dd className="flex items-center gap-2 font-medium">
                <UserAvatar user={occurrence.user} size="sm" />
                <span>
                  {isOwner ? 'Você' : occurrence.user.name}
                  <span className="block text-xs text-brand-700">
                    {userTypeLabels[occurrence.user.userType]}
                  </span>
                </span>
              </dd>
            </div>
          </dl>

          {occurrence.description && (
            <div className="text-sm">
              <h3 className="text-brand-700">Observações</h3>
              <p className="whitespace-pre-line">{occurrence.description}</p>
            </div>
          )}

          <CollectionPanel occurrence={occurrence} user={user} onChange={replace} />

          {/* Rota só para quem assumiu a coleta em andamento */}
          {occurrence.status === 'IN_COLLECTION' &&
            occurrence.collection?.collector.id === user?.id && (
              <CollectorRoute occurrence={occurrence} />
            )}

          <Timeline occurrence={occurrence} viewerId={user?.id} />

          {actionError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}

          {(canEdit || canCancel) && (
            <div className="flex flex-col gap-2 border-t border-brand-100 pt-4 sm:flex-row">
              {canEdit && (
                <Link
                  to={`/ocorrencias/${occurrence.id}/editar`}
                  className="flex-1 rounded-xl border-2 border-brand-700 px-4 py-2.5 text-center font-semibold hover:bg-brand-100"
                >
                  Editar
                </Link>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 rounded-xl border-2 border-red-700 px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {cancelling ? 'Cancelando…' : 'Cancelar ocorrência'}
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
