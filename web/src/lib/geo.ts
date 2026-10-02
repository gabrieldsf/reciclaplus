import type { LatLng } from './types'

// Centro usado só na primeira visita, antes de qualquer localização conhecida (São Paulo)
export const DEFAULT_CENTER: LatLng = { latitude: -23.5505, longitude: -46.6333 }

const LAST_LOCATION_KEY = 'reciclaplus:last-location'

// Última localização conhecida do usuário, para o mapa já abrir perto dele
export function getLastLocation(): LatLng | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_LOCATION_KEY) ?? 'null')
    if (typeof saved?.latitude === 'number' && typeof saved?.longitude === 'number') {
      return { latitude: saved.latitude, longitude: saved.longitude }
    }
  } catch {
    // armazenamento indisponível ou valor corrompido
  }
  return null
}

export function saveLastLocation({ latitude, longitude }: LatLng) {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ latitude, longitude }))
  } catch {
    // armazenamento indisponível: apenas não lembra a posição
  }
}

export function initialMapCenter() {
  return getLastLocation() ?? DEFAULT_CENTER
}

export function formatAccuracy(meters: number) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

// Distância em linha reta entre dois pontos (fórmula de Haversine), em km
export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}
