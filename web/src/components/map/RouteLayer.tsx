import { latLngBounds } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { dotSpacingMeters, dotsAlong } from '../../lib/route'
import type { LatLng } from '../../lib/types'
import { useAuth } from '../../auth/AuthContext'
import { collectorIcon } from './markers'

type RouteLayerProps = {
  // Trecho que falta: posição atual → … → material
  remainingPath: LatLng[]
  position: LatLng | null
  heading: number
  // Muda quando a rota é recalculada ou a coleta é trocada: reenquadra o mapa
  fitKey: string | null
  fullPath: LatLng[] | null
}

// Desenha o caminho do coletor dentro de um mapa: linha fininha + bolinhas espaçadas
// pela tela (não por metros) + avatar do coletor na posição atual
export function RouteLayer({
  remainingPath,
  position,
  heading,
  fitKey,
  fullPath,
}: RouteLayerProps) {
  const map = useMap()
  const { user } = useAuth()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })

  // Enquadra o caminho inteiro quando chega uma rota nova (ou outra coleta é escolhida)
  const fitted = useRef<string | null>(null)
  useEffect(() => {
    if (!fitKey || !fullPath || fitted.current === fitKey) return
    fitted.current = fitKey
    map.fitBounds(latLngBounds(fullPath.map((p) => [p.latitude, p.longitude])), {
      padding: [40, 40],
      maxZoom: 17,
    })
  }, [map, fitKey, fullPath])

  const latitude = remainingPath[0]?.latitude ?? 0
  const dots = useMemo(
    () => dotsAlong(remainingPath, dotSpacingMeters(zoom, latitude)),
    [remainingPath, zoom, latitude],
  )

  return (
    <>
      {remainingPath.length > 1 && (
        <Polyline
          positions={remainingPath.map((p) => [p.latitude, p.longitude])}
          interactive={false}
          className="route-line"
          pathOptions={{ color: '#f59e0b', weight: 3, opacity: 0.45, lineCap: 'round' }}
        />
      )}
      {dots.map((dot, index) => (
        <CircleMarker
          key={`${index}-${dot.latitude.toFixed(5)},${dot.longitude.toFixed(5)}`}
          center={[dot.latitude, dot.longitude]}
          radius={4.5}
          interactive={false}
          className="route-dot"
          pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 1 }}
        />
      ))}
      {position && user && (
        <Marker
          position={[position.latitude, position.longitude]}
          icon={collectorIcon(user, heading)}
          zIndexOffset={1000}
          interactive={false}
        />
      )}
    </>
  )
}
