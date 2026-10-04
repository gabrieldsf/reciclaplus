// Caminho pelas ruas entre dois pontos (OpenRouteService, perfil a pé).
// Sem ORS_API_KEY, ou se o serviço falhar, devolve uma linha reta: o app continua
// funcionando, só que a trilha não segue as ruas.
import { z } from 'zod'

export type Point = { latitude: number; longitude: number }

export type Route = {
  path: Point[]
  distanceMeters: number
  // De onde veio o caminho (o front avisa quando é linha reta)
  source: 'streets' | 'straight'
}

type RouteProvider = (from: Point, to: Point) => Promise<Omit<Route, 'source'>>

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

export function distanceMeters(a: Point, b: Point) {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function pathLength(path: Point[]) {
  let total = 0
  for (let i = 1; i < path.length; i++) total += distanceMeters(path[i - 1]!, path[i]!)
  return total
}

export function straightRoute(from: Point, to: Point): Route {
  return { path: [from, to], distanceMeters: distanceMeters(from, to), source: 'straight' }
}

// Resposta GeoJSON do OpenRouteService (validada: formato inesperado → linha reta)
const orsResponse = z.object({
  features: z
    .array(
      z.object({
        // [lng, lat] ou [lng, lat, altitude]
        geometry: z.object({ coordinates: z.array(z.array(z.number()).min(2)).min(2) }),
        properties: z.object({
          summary: z.object({ distance: z.number().optional() }).optional(),
        }),
      }),
    )
    .min(1),
})

const openRouteService: RouteProvider = async (from, to) => {
  const res = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: {
      Authorization: process.env['ORS_API_KEY']!,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json, application/json',
    },
    // O OpenRouteService usa [longitude, latitude]
    body: JSON.stringify({
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
    }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`OpenRouteService respondeu ${res.status}`)
  const feature = orsResponse.parse(await res.json()).features[0]!
  const path = feature.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude: latitude!,
    longitude: longitude!,
  }))
  return {
    path,
    distanceMeters: feature.properties.summary?.distance ?? pathLength(path),
  }
}

let provider: RouteProvider | null = null

// Permite trocar o serviço real por um falso nos testes (null volta ao padrão)
export function setRouteProvider(fake: RouteProvider | null) {
  provider = fake
}

export async function walkingRoute(from: Point, to: Point): Promise<Route> {
  const active = provider ?? (process.env['ORS_API_KEY'] ? openRouteService : null)
  if (!active) return straightRoute(from, to)
  try {
    return { ...(await active(from, to)), source: 'streets' }
  } catch (err) {
    console.error('Falha ao calcular rota, usando linha reta:', (err as Error).message)
    return straightRoute(from, to)
  }
}
