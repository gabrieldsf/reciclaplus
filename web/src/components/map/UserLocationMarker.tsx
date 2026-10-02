import { CircleMarker, Tooltip } from 'react-leaflet'
import type { LatLng } from '../../lib/types'

export function UserLocationMarker({ position }: { position: LatLng }) {
  return (
    <CircleMarker
      center={[position.latitude, position.longitude]}
      radius={8}
      pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
    >
      <Tooltip>Você está aqui</Tooltip>
    </CircleMarker>
  )
}
