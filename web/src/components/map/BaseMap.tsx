import 'leaflet/dist/leaflet.css'
import type { ReactNode } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { MapContainerProps } from 'react-leaflet'
import { initialMapCenter } from '../../lib/geo'
import type { LatLng } from '../../lib/types'

type BaseMapProps = Omit<MapContainerProps, 'center'> & {
  center?: LatLng
  className?: string
  children?: ReactNode
}

// Mapa Leaflet com base do OpenStreetMap. `isolate` impede que as camadas do
// Leaflet (z-index alto) fiquem por cima do cabeçalho e da navegação.
export function BaseMap({
  center = initialMapCenter(),
  className = '',
  children,
  ...props
}: BaseMapProps) {
  return (
    <div className={`isolate ${className}`}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={14}
        className="h-full w-full"
        {...props}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  )
}
