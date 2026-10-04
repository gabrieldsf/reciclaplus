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

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// Coletor no caminho: foto ou avatar do perfil (sem nenhum, a inicial do nome) com anel
// amarelo e uma setinha apontando para a direção do caminho (0° = norte)
export function collectorIcon(user: { name: string; avatarUrl: string | null }, heading: number) {
  const face = user.avatarUrl
    ? `<img src="${escapeHtml(user.avatarUrl)}" alt="" />`
    : `<span>${escapeHtml(user.name.trim().charAt(0).toUpperCase())}</span>`
  return divIcon({
    className: '',
    html: `<div class="collector-marker" role="img" aria-label="Você">
      <div class="collector-heading" style="transform: rotate(${Math.round(heading)}deg)"></div>
      <div class="collector-face">${face}</div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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
