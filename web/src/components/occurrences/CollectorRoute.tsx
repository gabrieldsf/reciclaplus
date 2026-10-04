import { divIcon, latLngBounds } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, Marker, useMap } from 'react-leaflet'
import { useWatchPosition } from '../../hooks/useWatchPosition'
import { api } from '../../lib/api'
import { formatDistance } from '../../lib/geo'
import {
  bearing,
  dotsAlong,
  isOffRoute,
  navigationLinks,
  remainingDots,
  remainingMeters,
} from '../../lib/route'
import type { LatLng, Occurrence } from '../../lib/types'
import { BaseMap } from '../map/BaseMap'
import { categoryIcon } from '../map/markers'

type Route = { path: LatLng[]; distanceMeters: number; source: 'streets' | 'straight' }

// Intervalo mínimo entre pedidos de rota nova (quando a pessoa sai do caminho)
const REFETCH_MS = 20_000

// Come-come virado para a direção do caminho. A boca desenhada aponta para a direita
// (leste = 90°); indo para a esquerda, espelha para o olho continuar em cima.
function comecomeIcon(heading: number) {
  const rotation = heading - 90
  const mirror = heading > 180 ? ' scaleY(-1)' : ''
  return divIcon({
    className: '',
    html: `<div class="comecome" style="transform: rotate(${rotation}deg)${mirror}" role="img" aria-label="Você">
      <div class="comecome-half top"><span class="comecome-eye"></span><span class="comecome-leaf"></span></div>
      <div class="comecome-half bottom"></div>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

// Enquadra o caminho inteiro uma vez, quando a primeira rota chega
function FitRoute({ path }: { path: LatLng[] | null }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!path || fitted.current) return
    fitted.current = true
    map.fitBounds(latLngBounds(path.map((p) => [p.latitude, p.longitude])), {
      padding: [32, 32],
      maxZoom: 17,
    })
  }, [map, path])
  return null
}

// Rota do coletor até o material: bolinhas pelo caminho, que o come-come vai "comendo"
// conforme a pessoa anda, e atalhos para o GPS do celular.
export function CollectorRoute({ occurrence }: { occurrence: Occurrence }) {
  const { position, error } = useWatchPosition()
  const [route, setRoute] = useState<Route | null>(null)
  const lastFetch = useRef(0)
  const destination = useMemo(
    () => ({ latitude: occurrence.latitude, longitude: occurrence.longitude }),
    [occurrence.latitude, occurrence.longitude],
  )

  const dots = useMemo(() => (route ? dotsAlong(route.path) : []), [route])

  // Pede a rota na primeira posição e de novo se a pessoa sair do caminho
  useEffect(() => {
    if (!position) return
    const needsRoute = !route || isOffRoute(dots, position)
    if (!needsRoute || Date.now() - lastFetch.current < (route ? REFETCH_MS : 0)) return
    lastFetch.current = Date.now()
    const query = `lat=${position.latitude}&lng=${position.longitude}`
    api<{ route: Route }>(`/occurrences/${occurrence.id}/route?${query}`)
      .then((res) => setRoute(res.route))
      .catch(() => {})
  }, [position, route, dots, occurrence.id])

  const remaining = position ? remainingDots(dots, position, destination) : dots
  const heading = position ? bearing(position, remaining[0] ?? destination) : 90
  const left = position && route ? remainingMeters(remaining, position, destination) : null
  const links = navigationLinks(destination)

  return (
    <section
      aria-label="Caminho até o material"
      className="flex flex-col gap-3 border-t border-brand-100 pt-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">Caminho até o material</h3>
        {left !== null && (
          <span className="text-sm font-bold" aria-live="polite">
            {left < 25 ? 'Você chegou! 🎉' : `Faltam ${formatDistance(left / 1000)}`}
          </span>
        )}
      </div>

      {error && !position && <p className="text-sm text-red-700">{error}</p>}

      <BaseMap
        center={position ?? destination}
        zoom={16}
        className="h-72 overflow-hidden rounded-lg border-2 border-brand-700/30"
      >
        <FitRoute path={route?.path ?? null} />
        {remaining.map((dot, index) => (
          <CircleMarker
            key={`${dot.latitude},${dot.longitude},${index}`}
            center={[dot.latitude, dot.longitude]}
            radius={4}
            interactive={false}
            className="route-dot"
            pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 1 }}
          />
        ))}
        <Marker
          position={[destination.latitude, destination.longitude]}
          icon={categoryIcon(occurrence.category.name)}
          alt={`Destino: ${occurrence.category.name}`}
        />
        {position && (
          <Marker
            position={[position.latitude, position.longitude]}
            icon={comecomeIcon(heading)}
            zIndexOffset={1000}
            interactive={false}
          />
        )}
      </BaseMap>

      {route?.source === 'straight' && (
        <p className="text-xs text-brand-700">
          Trajeto aproximado em linha reta. Para o caminho pelas ruas, use o GPS abaixo.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a
          href={links.googleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand-700 px-3 py-2.5 text-sm font-semibold hover:bg-brand-100"
        >
          <span aria-hidden="true">🗺️</span> Google Maps
        </a>
        <a
          href={links.waze}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand-700 px-3 py-2.5 text-sm font-semibold hover:bg-brand-100"
        >
          <span aria-hidden="true">🚗</span> Waze
        </a>
      </div>
    </section>
  )
}
