import type { Map as LeafletMap } from 'leaflet'
import { distanceKm } from '../../lib/geo'
import type { LatLng } from '../../lib/types'

// Acima disso a animação (flyTo) leva segundos e o mapa parece "preso" no lugar antigo
const MAX_ANIMATED_KM = 30

// Leva o mapa até a posição: anima deslocamentos curtos e pula direto nos longos
export function moveMapTo(map: LeafletMap, position: LatLng, zoom: number) {
  const center = map.getCenter()
  const far =
    distanceKm({ latitude: center.lat, longitude: center.lng }, position) > MAX_ANIMATED_KM
  const target: [number, number] = [position.latitude, position.longitude]
  if (far) map.setView(target, zoom, { animate: false })
  else map.flyTo(target, zoom, { duration: 0.8 })
}
