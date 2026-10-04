import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { OccurrenceThumb } from '../components/occurrences/OccurrenceThumb'
import { StatusBadge } from '../components/occurrences/StatusBadge'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import type { MyCollection, Occurrence } from '../lib/types'

type Tab = 'ocorrencias' | 'coletas'

type HistoryData = { occurrences: Occurrence[]; collections: MyCollection[] }

export function HistoryPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('aba') === 'coletas' ? 'coletas' : 'ocorrencias'
  const [data, setData] = useState<HistoryData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api<{ occurrences: Occurrence[] }>('/me/occurrences'),
      api<{ collections: MyCollection[] }>('/me/collections'),
    ])
      .then(
        ([o, c]) => active && setData({ occurrences: o.occurrences, collections: c.collections }),
      )
      .catch((err: Error) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [])

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'ocorrencias', label: 'Minhas ocorrências', count: data?.occurrences.length },
    { id: 'coletas', label: 'Minhas coletas', count: data?.collections.length },
  ]

  return (
    <section className="mx-auto max-w-2xl p-4 md:p-8">
      <h1 className="mb-4 text-2xl font-bold">Histórico</h1>

      <div
        role="tablist"
        aria-label="Histórico"
        className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1 shadow-sm"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setParams({ aba: t.id }, { replace: true })}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === t.id ? 'bg-brand-700 text-white' : 'text-brand-900 hover:bg-brand-50'}`}
          >
            {t.label}
            {t.count !== undefined && ` (${t.count})`}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
            {error}
          </p>
        )}
        {!data && !error && <p className="text-brand-700">Carregando…</p>}
        {data && tab === 'ocorrencias' && <OccurrenceList occurrences={data.occurrences} />}
        {data && tab === 'coletas' && <CollectionList collections={data.collections} />}
      </div>
    </section>
  )
}

function OccurrenceList({ occurrences }: { occurrences: Occurrence[] }) {
  if (occurrences.length === 0) {
    return (
      <EmptyState
        text="Você ainda não informou nenhum reciclável."
        action={{ to: '/informar', label: 'Informar reciclável' }}
      />
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {occurrences.map((o) => (
        <HistoryCard
          key={o.id}
          occurrence={o}
          collectionPhotoUrl={o.collection?.photoUrl ?? null}
          badge={<StatusBadge status={o.status} />}
        >
          <p>Registrada em {formatDateTime(o.createdAt)}</p>
          {o.collection && (
            <p>
              {o.collection.cancelledAt
                ? `Cancelada durante a coleta de ${o.collection.collector.name}`
                : o.collection.completedAt
                  ? `Coletada por ${o.collection.collector.name} em ${formatDateTime(o.collection.completedAt)}`
                  : `Em coleta por ${o.collection.collector.name}`}
            </p>
          )}
        </HistoryCard>
      ))}
    </ul>
  )
}

const collectionStates = {
  inProgress: { label: 'Em andamento', classes: 'bg-amber-100 text-amber-800' },
  done: { label: 'Concluída', classes: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelada pelo dono', classes: 'bg-stone-200 text-stone-700' },
}

function CollectionList({ collections }: { collections: MyCollection[] }) {
  if (collections.length === 0) {
    return (
      <EmptyState
        text="Você ainda não assumiu nenhuma coleta."
        action={{ to: '/mapa', label: 'Encontrar recicláveis no mapa' }}
      />
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {collections.map((c) => {
        const state = c.completedAt ? 'done' : c.cancelledAt ? 'cancelled' : 'inProgress'
        const { label, classes } = collectionStates[state]
        return (
          <HistoryCard
            key={c.id}
            occurrence={c.occurrence}
            collectionPhotoUrl={c.photoUrl}
            badge={
              <span
                className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${classes}`}
              >
                {label}
              </span>
            }
          >
            <p>Assumida em {formatDateTime(c.acceptedAt)}</p>
            {c.completedAt && (
              <p>
                Concluída em {formatDateTime(c.completedAt)}
                {c.collectedQuantity && ` · ${c.collectedQuantity}`}
              </p>
            )}
            <p>Informada por {c.occurrence.user.name}</p>
          </HistoryCard>
        )
      })}
    </ul>
  )
}

function HistoryCard({
  occurrence,
  collectionPhotoUrl,
  badge,
  children,
}: {
  occurrence: Omit<Occurrence, 'collection'>
  // Foto enviada ao finalizar a coleta (comprovante)
  collectionPhotoUrl: string | null
  badge: ReactNode
  children: ReactNode
}) {
  return (
    <li>
      <Link
        to={`/ocorrencias/${occurrence.id}`}
        className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm hover:ring-2 hover:ring-brand-500/30"
      >
        <OccurrenceThumb categoryName={occurrence.category.name} photoUrl={occurrence.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">
              {occurrence.category.name}
              {occurrence.subcategory && (
                <span className="font-normal text-brand-700"> · {occurrence.subcategory.name}</span>
              )}
            </p>
            {badge}
          </div>
          {occurrence.estimatedQuantity && (
            <p className="text-sm">Quantidade estimada: {occurrence.estimatedQuantity}</p>
          )}
          <div className="mt-1 text-xs text-brand-700">{children}</div>
          {collectionPhotoUrl && (
            <span className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-900">
              <img
                src={collectionPhotoUrl}
                alt="Foto da coleta"
                loading="lazy"
                className="size-10 rounded-md object-cover ring-1 ring-blue-200"
              />
              📸 Foto da coleta
            </span>
          )}
        </div>
        <span aria-hidden="true" className="self-center text-brand-700">
          ›
        </span>
      </Link>
    </li>
  )
}

function EmptyState({ text, action }: { text: string; action: { to: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm">
      <p className="text-brand-700">{text}</p>
      <Link
        to={action.to}
        className="rounded-xl bg-brand-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-900"
      >
        {action.label}
      </Link>
    </div>
  )
}
