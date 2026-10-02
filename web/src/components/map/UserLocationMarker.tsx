import { Circle, CircleMarker, Tooltip } from 'react-leaflet'
import type { DevicePosition } from '../../hooks/useCurrentPosition'

// Ponto azul na posição do aparelho, com círculo mostrando a margem de erro
export function UserLocationMarker({ position }: { position: DevicePosition }) {
  const center: [number, number] = [position.latitude, position.longitude]
  return (
    <>
      <Circle
        center={center}
        radius={position.accuracy}
        interactive={false}
        pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.1 }}
      />
      <CircleMarker
        center={center}
        radius={8}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
      >
        <Tooltip>Você está aqui</Tooltip>
      </CircleMarker>
    </>
  )
}
