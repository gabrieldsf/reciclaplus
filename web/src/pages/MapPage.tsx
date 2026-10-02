import { latLngBounds } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Marker, Popup, useMap } from 'react-leaflet'
import { BaseMap } from '../components/map/BaseMap'
import { categoryIcon } from '../components/map/markers'
import { UserLocationMarker } from '../components/map/UserLocationMarker'
import { CategoryFilter } from '../components/occurrences/CategoryFilter'
import { useCategories } from '../hooks/useCategories'
import { useCurrentPosition } from '../hooks/useCurrentPosition'
import { api } from '../lib/api'
import { categoryStyle } from '../lib/categories'
import { formatDateTime } from '../lib/format'
import { distanceKm, formatDistance } from '../lib/geo'
import type { LatLng, Occurrence } from '../lib/types'

// Na primeira carga, enquadra todas as ocorrências visíveis
function FitToOccurrences({ occurrences }: { occurrences: Occurrence[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || occurrences.length === 0) return
    fitted.current = true
    const bounds = latLngBounds(occurrences.map((o) => [o.latitude, o.longitude]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
  }, [map, occurrences])

  return null
}

function FlyTo({ position }: { position: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo([position.latitude, position.longitude], 15)
  }, [map, position])
  return null
}

export function MapPage() {
  const { categories, error: categoriesError } = useCategories()
  const [selected, setSelected] = useState<Set<number> | null>(null)
  const [fetched, setFetched] = useState<Occurrence[]>([])
  const [loadError, setLoadError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { position, locating, error: locationError, locate } = useCurrentPosition({ auto: true })

  // Começa com todas as categorias marcadas
  const selectedIds = selected ?? new Set(categories.map((c) => c.id))
  const allSelected = selectedIds.size === categories.length

  const selectedKey = [...selectedIds].sort((a, b) => a - b).join(',')
  useEffect(() => {
    // Sem categorias marcadas não há o que buscar (ver `occurrences` abaixo)
    if (categories.length === 0 || selectedKey === '') return
    let active = true
    const query = allSelected ? '' : `?categoryId=${selectedKey}`
    api<{ occurrences: Occurrence[] }>(`/occurrences${query}`)
      .then((res) => {
        if (!active) return
        setFetched(res.occurrences)
        setLoadError('')
      })
      .catch((err: Error) => active && setLoadError(err.message))
    return () => {
      active = false
    }
  }, [categories.length, selectedKey, allSelected])

  const occurrences = selectedKey === '' ? [] : fetched
  const error = categoriesError || loadError
  const filter = (
    <CategoryFilter categories={categories} selected={selectedIds} onChange={setSelected} />
  )

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-brand-100 bg-white p-4 md:block">
        {filter}
      </aside>

      <section className="relative flex-1" aria-label="Mapa de ocorrências">
        <BaseMap className="absolute inset-0">
          <FitToOccurrences occurrences={occurrences} />
          <FlyTo position={position} />
          {position && <UserLocationMarker position={position} />}
          {occurrences.map((occurrence) => (
            <Marker
              key={occurrence.id}
              position={[occurrence.latitude, occurrence.longitude]}
              icon={categoryIcon(occurrence.category.name)}
              alt={occurrence.category.name}
            >
              <Popup>
                <OccurrenceSummary occurrence={occurrence} userPosition={position} />
              </Popup>
            </Marker>
          ))}
        </BaseMap>

        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3">
          <p className="pointer-events-auto rounded-full bg-white/95 px-3 py-1 text-sm font-medium shadow">
            {occurrences.length === 1
              ? '1 ocorrência disponível'
              : `${occurrences.length} ocorrências disponíveis`}
          </p>
        </div>

        {(error || locationError) && (
          <p
            role="alert"
            className="absolute inset-x-3 top-14 z-[1000] rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 shadow"
          >
            {error || locationError}
          </p>
        )}

        <div className="absolute right-3 bottom-4 left-3 z-[1000] flex items-end justify-between gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="rounded-full bg-white px-4 py-2.5 font-semibold shadow-md md:invisible"
          >
            <span aria-hidden="true">⚙️ </span>Filtrar{!allSelected && ` (${selectedIds.size})`}
          </button>
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locating}
            aria-label="Centralizar na minha localização"
            title="Minha localização"
            className="grid size-12 place-items-center rounded-full bg-white text-xl shadow-md disabled:opacity-60"
          >
            {locating ? '…' : '📍'}
          </button>
        </div>
      </section>

      {filtersOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/40 md:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtrar por categoria"
            className="w-full rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            {filter}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-4 w-full rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OccurrenceSummary({
  occurrence,
  userPosition,
}: {
  occurrence: Occurrence
  userPosition: LatLng | null
}) {
  const { emoji } = categoryStyle(occurrence.category.name)
  return (
    <div className="flex min-w-48 flex-col gap-1 text-brand-900">
      <strong className="text-base">
        {emoji} {occurrence.category.name}
        {occurrence.subcategory && ` · ${occurrence.subcategory.name}`}
      </strong>
      {occurrence.estimatedQuantity && <span>Quantidade: {occurrence.estimatedQuantity}</span>}
      {userPosition && (
        <span>A {formatDistance(distanceKm(userPosition, occurrence))} de você</span>
      )}
      <span className="text-xs text-brand-700">{formatDateTime(occurrence.createdAt)}</span>
      <Link
        to={`/ocorrencias/${occurrence.id}`}
        className="mt-1 rounded-lg bg-brand-700 px-3 py-1.5 text-center font-semibold !text-white"
      >
        Ver detalhes
      </Link>
    </div>
  )
}
