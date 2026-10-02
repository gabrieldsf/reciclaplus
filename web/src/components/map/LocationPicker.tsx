import { useEffect, useRef } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import { useCurrentPosition } from '../../hooks/useCurrentPosition'
import { formatAccuracy, saveLastLocation } from '../../lib/geo'
import type { LatLng } from '../../lib/types'
import { BaseMap } from './BaseMap'
import { pickerIcon } from './markers'
import { moveMapTo } from './moveMapTo'
import { UserLocationMarker } from './UserLocationMarker'

type LocationPickerProps = {
  value: LatLng | null
  onChange: (value: LatLng) => void
  invalid?: boolean
  // Ao abrir, busca a localização do aparelho e já marca o ponto (se ainda não houver um)
  autoLocate?: boolean
}

// Acima disso, a posição do aparelho é aproximada demais para marcar sozinha
const GOOD_ACCURACY_METERS = 150

function PickOnClick({ onChange }: { onChange: (value: LatLng) => void }) {
  useMapEvents({
    click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  })
  return null
}

function FlyTo({ position, zoom }: { position: LatLng | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (position) moveMapTo(map, position, zoom)
  }, [map, position, zoom])
  return null
}

// Seleção de local: toque no mapa, arraste o marcador ou use a localização do aparelho
export function LocationPicker({ value, onChange, invalid, autoLocate }: LocationPickerProps) {
  const { position: devicePosition, locating, error, locate } = useCurrentPosition()
  // Valor mais recente, lido quando a localização automática chega
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  function select(next: LatLng) {
    saveLastLocation(next)
    onChange(next)
  }

  const autoRequested = useRef(false)
  useEffect(() => {
    if (!autoLocate || autoRequested.current) return
    autoRequested.current = true
    void locate().then((position) => {
      // Não sobrescreve um ponto que o usuário já marcou enquanto a localização chegava
      if (position && !valueRef.current) onChange(position)
    })
  }, [autoLocate, locate, onChange])

  async function handleUseMyLocation() {
    const position = await locate()
    if (position) onChange(position)
  }

  const imprecise = devicePosition && devicePosition.accuracy > GOOD_ACCURACY_METERS
  // Quanto pior a precisão, mais afastado o zoom, para o círculo de erro caber na tela
  const zoom = !devicePosition ? 16 : devicePosition.accuracy > 1000 ? 13 : imprecise ? 15 : 17

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
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {devicePosition && !error && (
        <p className={`text-sm ${imprecise ? 'text-amber-800' : 'text-brand-700'}`}>
          Precisão da sua localização: ~{formatAccuracy(devicePosition.accuracy)}.
          {imprecise && ' Confira no mapa e arraste o marcador até o local exato.'}
        </p>
      )}

      <BaseMap
        center={value ?? undefined}
        zoom={value ? 17 : 14}
        className={`h-72 overflow-hidden rounded-lg border-2 ${invalid ? 'border-red-600' : 'border-brand-700/30'}`}
      >
        <PickOnClick onChange={select} />
        <FlyTo position={devicePosition} zoom={zoom} />
        {devicePosition && <UserLocationMarker position={devicePosition} />}
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={pickerIcon}
            draggable
            zIndexOffset={1000}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng()
                select({ latitude: lat, longitude: lng })
              },
            }}
          />
        )}
      </BaseMap>
      <p className="text-xs text-brand-700">
        {value
          ? 'Toque no mapa ou arraste o marcador para ajustar o local.'
          : locating
            ? 'Buscando sua localização…'
            : 'Toque no mapa para marcar onde está o material.'}
      </p>
    </div>
  )
}
