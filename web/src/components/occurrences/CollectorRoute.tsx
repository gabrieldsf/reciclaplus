import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { useCollectorRoute } from '../../hooks/useCollectorRoute'
import { useWatchPosition } from '../../hooks/useWatchPosition'
import { formatLeft } from '../../lib/route'
import type { Occurrence } from '../../lib/types'
import { BaseMap } from '../map/BaseMap'
import { categoryIcon } from '../map/markers'
import { RouteLayer } from '../map/RouteLayer'
import { NavigationButtons } from './NavigationButtons'

// Rota do coletor nos detalhes da ocorrência: bolinhas pelo caminho, que o come-come
// vai "comendo" conforme a pessoa anda, e atalhos para o GPS do celular
export function CollectorRoute({ occurrence }: { occurrence: Occurrence }) {
  const { position, error } = useWatchPosition()
  const destination = useMemo(
    () => ({ latitude: occurrence.latitude, longitude: occurrence.longitude }),
    [occurrence.latitude, occurrence.longitude],
  )
  const progress = useCollectorRoute(occurrence.id, position, destination)

  return (
    <section
      aria-label="Caminho até o material"
      className="flex flex-col gap-3 border-t border-brand-100 pt-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">Caminho até o material</h3>
        {progress?.leftMeters != null && (
          <span className="text-sm font-bold" aria-live="polite">
            {formatLeft(progress.leftMeters)}
          </span>
        )}
      </div>

      {error && !position && <p className="text-sm text-red-700">{error}</p>}

      <BaseMap
        center={position ?? destination}
        zoom={16}
        className="h-72 overflow-hidden rounded-lg border-2 border-brand-700/30"
      >
        <Marker
          position={[destination.latitude, destination.longitude]}
          icon={categoryIcon(occurrence.category.name)}
          alt={`Destino: ${occurrence.category.name}`}
        />
        {progress && (
          <RouteLayer
            remainingPath={progress.remainingPath}
            position={position}
            heading={progress.heading}
            fitKey={progress.route ? occurrence.id : null}
            fullPath={progress.route?.path ?? null}
          />
        )}
      </BaseMap>

      {progress?.route?.source === 'straight' && (
        <p className="text-xs text-brand-700">
          Trajeto aproximado em linha reta. Para o caminho pelas ruas, use o GPS abaixo.
        </p>
      )}

      <NavigationButtons destination={destination} />
    </section>
  )
}
