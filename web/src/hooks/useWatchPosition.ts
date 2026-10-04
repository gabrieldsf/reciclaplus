import { useEffect, useState } from 'react'
import { saveLastLocation } from '../lib/geo'
import type { LatLng } from '../lib/types'

// Acompanha a posição do aparelho enquanto o componente estiver na tela e `enabled`
// for verdadeiro (o navegador só entrega a localização com o app aberto)
export function useWatchPosition({ enabled = true } = {}) {
  const [position, setPosition] = useState<LatLng | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      queueMicrotask(() => setError('Seu navegador não oferece localização.'))
      return
    }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude }
        setPosition(next)
        setError('')
        saveLastLocation(next)
      },
      (err) =>
        setError(
          err.code === 1
            ? 'Permita o acesso à localização para ver o caminho até o material.'
            : 'Não foi possível obter sua localização agora.',
        ),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])

  return { position, error }
}
