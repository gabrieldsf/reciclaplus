import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { bearing, dotsAlong, isOffRoute, remainingDots, remainingMeters } from '../lib/route'
import type { LatLng } from '../lib/types'

export type CollectorRouteData = {
  path: LatLng[]
  distanceMeters: number
  source: 'streets' | 'straight'
}

// Intervalo mínimo entre pedidos de rota nova (quando a pessoa sai do caminho)
const REFETCH_MS = 20_000
// Pontos internos (bem próximos) usados só para medir o progresso; o que aparece na tela
// é espaçado conforme o zoom (ver RouteLayer)
const PROGRESS_SPACING_M = 10

// Busca a rota do coletor até a ocorrência e calcula o progresso pela posição atual:
// quanto falta, para onde a seta do coletor aponta e o trecho ainda não percorrido.
export function useCollectorRoute(
  occurrenceId: string | null,
  position: LatLng | null,
  destination: LatLng | null,
) {
  const [state, setState] = useState<{ id: string; route: CollectorRouteData } | null>(null)
  const lastFetch = useRef<{ id: string | null; at: number }>({ id: null, at: 0 })

  // Rota só vale para a ocorrência atual (trocar de coleta descarta a anterior)
  const route = state && state.id === occurrenceId ? state.route : null
  const progressDots = useMemo(
    () => (route ? dotsAlong(route.path, PROGRESS_SPACING_M) : []),
    [route],
  )

  useEffect(() => {
    if (!occurrenceId || !position) return
    const sameOccurrence = lastFetch.current.id === occurrenceId
    const needsRoute = !route || isOffRoute(progressDots, position)
    const tooSoon = sameOccurrence && route && Date.now() - lastFetch.current.at < REFETCH_MS
    if (!needsRoute || tooSoon) return
    lastFetch.current = { id: occurrenceId, at: Date.now() }
    const query = `lat=${position.latitude}&lng=${position.longitude}`
    api<{ route: CollectorRouteData }>(`/occurrences/${occurrenceId}/route?${query}`)
      .then((res) => setState({ id: occurrenceId, route: res.route }))
      .catch(() => {})
  }, [occurrenceId, position, route, progressDots])

  return useMemo(() => {
    if (!destination) return null
    const remaining = position ? remainingDots(progressDots, position, destination) : progressDots
    return {
      route,
      // Trecho que ainda falta: posição atual → pontos restantes → material
      remainingPath: position ? [position, ...remaining, destination] : (route?.path ?? []),
      heading: position ? bearing(position, remaining[0] ?? destination) : 90,
      leftMeters: position && route ? remainingMeters(remaining, position, destination) : null,
    }
  }, [route, progressDots, position, destination])
}
