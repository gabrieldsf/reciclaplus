import { divIcon } from 'leaflet'
import { categoryStyle } from '../../lib/categories'

const iconCache = new Map<string, ReturnType<typeof divIcon>>()

// Marcador em formato de gota, na cor da categoria, com o emoji dela
export function categoryIcon(categoryName: string) {
  let icon = iconCache.get(categoryName)
  if (!icon) {
    const { color, emoji } = categoryStyle(categoryName)
    icon = divIcon({
      className: '',
      html: `<div class="category-marker" style="--marker-color:${color}"><span>${emoji}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -34],
    })
    iconCache.set(categoryName, icon)
  }
  return icon
}

// Marcador neutro usado ao escolher o local de uma nova ocorrência
export const pickerIcon = divIcon({
  className: '',
  html: '<div class="category-marker" style="--marker-color:#1b4332"><span>📍</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})
