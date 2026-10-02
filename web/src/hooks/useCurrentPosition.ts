import { useCallback, useEffect, useRef, useState } from 'react'
import { saveLastLocation } from '../lib/geo'
import type { LatLng } from '../lib/types'

export type DevicePosition = LatLng & { accuracy: number }

type State = { position: DevicePosition | null; locating: boolean; error: string }

const errorMessages: Record<number, string> = {
  1: 'Permissão de localização negada. Libere o acesso no ícone de cadeado da barra de endereço e tente de novo.',
  2: 'Não foi possível obter sua localização. Verifique se a localização está ativada no aparelho (no Windows: Configurações › Privacidade e segurança › Localização).',
  3: 'A localização demorou demais para responder. Tente de novo ou marque o local no mapa.',
}

function getPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options),
  )
}

// Tenta GPS (alta precisão) e, se falhar, cai para a localização por Wi-Fi/rede,
// que é o que computadores e muitos celulares em ambientes fechados conseguem
async function readDevicePosition(): Promise<DevicePosition> {
  let result: GeolocationPosition
  try {
    result = await getPosition({ enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 })
  } catch (err) {
    if ((err as GeolocationPositionError).code === 1) throw err
    result = await getPosition({ enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 })
  }
  const { latitude, longitude, accuracy } = result.coords
  return { latitude, longitude, accuracy }
}

// Localização do dispositivo. Com `auto`, é solicitada assim que a tela abre.
export function useCurrentPosition({ auto = false } = {}) {
  const [state, setState] = useState<State>({ position: null, locating: false, error: '' })
  const autoRequested = useRef(false)

  const locate = useCallback(async () => {
    if (!window.isSecureContext) {
      setState((s) => ({
        ...s,
        error: 'A localização só funciona em conexões seguras (HTTPS ou localhost).',
      }))
      return null
    }
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, error: 'Seu navegador não oferece localização.' }))
      return null
    }

    setState((s) => ({ ...s, locating: true, error: '' }))
    try {
      const position = await readDevicePosition()
      saveLastLocation(position)
      setState({ position, locating: false, error: '' })
      return position
    } catch (err) {
      const code = (err as GeolocationPositionError).code
      setState((s) => ({ ...s, locating: false, error: errorMessages[code] ?? errorMessages[2]! }))
      return null
    }
  }, [])

  useEffect(() => {
    // O ref evita pedir duas vezes no StrictMode (efeitos rodam 2x em desenvolvimento)
    if (!auto || autoRequested.current) return
    autoRequested.current = true
    void locate()
  }, [auto, locate])

  return { ...state, locate }
}
