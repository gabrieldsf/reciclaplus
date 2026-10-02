import { useCallback, useEffect, useState } from 'react'
import type { LatLng } from '../lib/types'

type State = { position: LatLng | null; locating: boolean; error: string }

const errorMessages: Record<number, string> = {
  1: 'Permissão de localização negada.',
  2: 'Não foi possível obter sua localização.',
  3: 'A localização demorou demais para responder.',
}

// Localização do dispositivo, solicitada sob demanda (nunca sem ação do usuário,
// exceto com `auto` quando a permissão já foi concedida antes)
export function useCurrentPosition({ auto = false } = {}) {
  const [state, setState] = useState<State>({ position: null, locating: false, error: '' })

  const locate = useCallback(() => {
    return new Promise<LatLng | null>((resolve) => {
      if (!('geolocation' in navigator)) {
        setState((s) => ({ ...s, error: 'Seu navegador não oferece localização.' }))
        resolve(null)
        return
      }
      setState((s) => ({ ...s, locating: true, error: '' }))
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const position = { latitude: coords.latitude, longitude: coords.longitude }
          setState({ position, locating: false, error: '' })
          resolve(position)
        },
        (err) => {
          setState((s) => ({ ...s, locating: false, error: errorMessages[err.code] ?? '' }))
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      )
    })
  }, [])

  useEffect(() => {
    if (!auto || !navigator.permissions) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') void locate()
      })
      .catch(() => {})
  }, [auto, locate])

  return { ...state, locate }
}
