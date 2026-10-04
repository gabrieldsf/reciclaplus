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

// Símbolo de reciclagem (seta circular do logo do Recicla+) no corpo do come-come
const RECYCLE_SVG =
  '<svg class="comecome-recycle" viewBox="0 0 512 512" aria-hidden="true"><path d="M346 149 A140 140 0 1 1 208 124.4" fill="none" stroke="currentColor" stroke-width="64" stroke-linecap="round"/><path d="M262 104 L180 76 L214 180 Z" fill="currentColor" stroke="currentColor" stroke-width="24" stroke-linejoin="round"/></svg>'

// Come-come do coletor, virado para a direção do caminho. A boca desenhada aponta para a
// direita (leste = 90°); indo para a esquerda, espelha para o olho continuar em cima.
export function comecomeIcon(heading: number) {
  const rotation = Math.round(heading - 90)
  const mirror = heading > 180 ? ' scaleY(-1)' : ''
  return divIcon({
    className: '',
    html: `<div class="comecome" style="transform: rotate(${rotation}deg)${mirror}" role="img" aria-label="Você">
      <div class="comecome-half top"><span class="comecome-eye"></span><span class="comecome-leaf"></span></div>
      <div class="comecome-half bottom">${RECYCLE_SVG}</div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

// Destino de uma coleta em andamento: marcador da categoria com anel de destaque
// (mais forte no destino da rota escolhida)
export function activeDestinationIcon(categoryName: string, selected: boolean) {
  const { color, emoji } = categoryStyle(categoryName)
  return divIcon({
    className: '',
    html: `<div class="active-destination${selected ? ' selected' : ''}"><div class="category-marker" style="--marker-color:${color}"><span>${emoji}</span></div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })
}
