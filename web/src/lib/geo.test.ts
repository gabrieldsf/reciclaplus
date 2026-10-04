import { describe, expect, it } from 'vitest'
import { distanceKm, formatDistance, sortByDistance } from './geo'

describe('distanceKm', () => {
  it('é zero para o mesmo ponto', () => {
    const p = { latitude: -23.5505, longitude: -46.6333 }
    expect(distanceKm(p, p)).toBe(0)
  })

  it('calcula São Paulo → Rio de Janeiro (~360 km)', () => {
    const sp = { latitude: -23.5505, longitude: -46.6333 }
    const rio = { latitude: -22.9068, longitude: -43.1729 }
    expect(distanceKm(sp, rio)).toBeGreaterThan(355)
    expect(distanceKm(sp, rio)).toBeLessThan(365)
  })

  it('é simétrica', () => {
    const a = { latitude: -23.5, longitude: -46.6 }
    const b = { latitude: -23.6, longitude: -46.7 }
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a))
  })
})

describe('formatDistance', () => {
  it.each([
    [0.003, '10 m'],
    [0.234, '230 m'],
    [1.25, '1,3 km'],
    [9.94, '9,9 km'],
    [12.6, '13 km'],
  ])('%s km → %s', (km, expected) => {
    expect(formatDistance(km)).toBe(expected)
  })
})

describe('sortByDistance', () => {
  const here = { latitude: -25.4284, longitude: -49.2733 }
  const near = { id: 'perto', latitude: -25.429, longitude: -49.274 }
  const mid = { id: 'meio', latitude: -25.44, longitude: -49.28 }
  const far = { id: 'longe', latitude: -23.55, longitude: -46.63 }

  it('ordena da mais próxima para a mais distante, com a distância', () => {
    const sorted = sortByDistance([far, near, mid], here)
    expect(sorted.map((s) => s.item.id)).toEqual(['perto', 'meio', 'longe'])
    expect(sorted[0]!.distance).toBeLessThan(0.2)
  })

  it('sem posição, mantém a ordem original e não informa distância', () => {
    const sorted = sortByDistance([far, near], null)
    expect(sorted.map((s) => s.item.id)).toEqual(['longe', 'perto'])
    expect(sorted.every((s) => s.distance === null)).toBe(true)
  })
})
