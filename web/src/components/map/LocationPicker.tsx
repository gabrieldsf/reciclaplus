import { useEffect } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import { useCurrentPosition } from '../../hooks/useCurrentPosition'
import type { LatLng } from '../../lib/types'
import { BaseMap } from './BaseMap'
import { pickerIcon } from './markers'

type LocationPickerProps = {
  value: LatLng | null
  onChange: (value: LatLng) => void
  invalid?: boolean
}

function PickOnClick({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  })
  return null
}

function FlyTo({ position }: { position: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo([position.latitude, position.longitude], Math.max(map.getZoom(), 16))
  }, [map, position])
  return null
}

// Seleção de local: toque no mapa, arraste o marcador ou use a localização do aparelho
export function LocationPicker({ value, onChange, invalid }: LocationPickerProps) {
  const { position: devicePosition, locating, error, locate } = useCurrentPosition()

  async function handleUseMyLocation() {
    const position = await locate()
    if (position) onChange(position)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={locating}
        className="flex items-center justify-center gap-2 rounded-lg border-2 border-brand-700 px-3 py-2.5 font-medium hover:bg-brand-100 disabled:opacity-60"
      >
        <span aria-hidden="true">📍</span>
        {locating ? 'Obtendo localização…' : 'Usar minha localização'}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}

      <BaseMap
        center={value ?? undefined}
        className={`h-64 overflow-hidden rounded-lg border-2 ${invalid ? 'border-red-600' : 'border-brand-700/30'}`}
      >
        <PickOnClick onChange={onChange} />
        <FlyTo position={devicePosition} />
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={pickerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng()
                onChange({ latitude: lat, longitude: lng })
              },
            }}
          />
        )}
      </BaseMap>
      <p className="text-xs text-brand-700">
        {value
          ? `Local selecionado: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} — arraste o marcador para ajustar.`
          : 'Toque no mapa para marcar onde está o material.'}
      </p>
    </div>
  )
}
