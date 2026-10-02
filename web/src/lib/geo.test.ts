import { describe, expect, it } from 'vitest'
import { distanceKm, formatDistance } from './geo'

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
