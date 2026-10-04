// Geometria da rota do coletor: bolinhas ao longo do caminho, quais já foram
// "comidas", direção do come-come e distância que falta.
import { distanceKm } from './geo'
import type { LatLng } from './types'

const meters = (a: LatLng, b: LatLng) => distanceKm(a, b) * 1000

// Ponto entre a e b, na fração t (0 = a, 1 = b)
function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  }
}

// Bolinhas a cada `spacing` metros ao longo do caminho (sem o ponto final, que é o material)
export function dotsAlong(path: LatLng[], spacing = 20): LatLng[] {
  const dots: LatLng[] = []
  let carry = spacing // distância até a próxima bolinha
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const segment = meters(a, b)
    let at = carry
    while (at < segment) {
      dots.push(lerp(a, b, at / segment))
      at += spacing
    }
    carry = at - segment
  }
  // A última bolinha colada no material fica escondida atrás do ícone dele
  const end = path[path.length - 1]
  if (end && dots.length > 0 && meters(dots[dots.length - 1]!, end) < spacing / 2) dots.pop()
  return dots
}

// Índice da bolinha mais próxima da posição atual
export function nearestIndex(dots: LatLng[], position: LatLng) {
  let best = 0
  let bestDistance = Infinity
  dots.forEach((dot, index) => {
    const d = meters(dot, position)
    if (d < bestDistance) {
      best = index
      bestDistance = d
    }
  })
  return { index: best, distance: bestDistance }
}

// Bolinhas que ainda faltam: tudo antes da mais próxima já foi "comido". A mais próxima
// também foi, se a pessoa está em cima dela (até 8 m) ou já passou dela (está mais perto do
// ponto seguinte do que a própria bolinha).
export function remainingDots(dots: LatLng[], position: LatLng, destination: LatLng) {
  if (dots.length === 0) return []
  const { index, distance } = nearestIndex(dots, position)
  const next = dots[index + 1] ?? destination
  const passed = distance <= 8 || meters(position, next) < meters(dots[index]!, next)
  return dots.slice(passed ? index + 1 : index)
}

// Distância a percorrer: até a próxima bolinha, pelas bolinhas e até o material
export function remainingMeters(remaining: LatLng[], position: LatLng, destination: LatLng) {
  const points = [position, ...remaining, destination]
  let total = 0
  for (let i = 1; i < points.length; i++) total += meters(points[i - 1]!, points[i]!)
  return total
}

// Fora do caminho calculado (ex.: pegou outra rua): hora de pedir uma rota nova
export function isOffRoute(dots: LatLng[], position: LatLng, tolerance = 60) {
  return dots.length > 0 && nearestIndex(dots, position).distance > tolerance
}

// Direção de a para b em graus: 0 = norte, 90 = leste
export function bearing(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Abrem o app de GPS do celular com o destino marcado
export function navigationLinks({ latitude, longitude }: LatLng) {
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
  }
}
