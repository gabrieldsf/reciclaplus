import { navigationLinks } from '../../lib/route'
import type { LatLng } from '../../lib/types'

const buttonClass =
  'flex items-center justify-center gap-2 rounded-xl border-2 border-brand-700 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-brand-100'

// Abrem o GPS do celular (Google Maps ou Waze) com o destino marcado
export function NavigationButtons({ destination }: { destination: LatLng }) {
  const links = navigationLinks(destination)
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={links.googleMaps} target="_blank" rel="noopener noreferrer" className={buttonClass}>
        <span aria-hidden="true">🗺️</span> Google Maps
      </a>
      <a href={links.waze} target="_blank" rel="noopener noreferrer" className={buttonClass}>
        <span aria-hidden="true">🚗</span> Waze
      </a>
    </div>
  )
}
