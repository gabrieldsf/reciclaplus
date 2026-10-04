import { describe, expect, it } from 'vitest'
import { distanceKm } from './geo'
import {
  bearing,
  dotSpacingMeters,
  dotsAlong,
  isOffRoute,
  metersPerPixel,
  navigationLinks,
  remainingDots,
  remainingMeters,
} from './route'

// Caminho em L: ~200 m para o leste e depois ~110 m para o norte
const start = { latitude: -25.43, longitude: -49.28 }
const corner = { latitude: -25.43, longitude: -49.278 }
const end = { latitude: -25.429, longitude: -49.278 }
const path = [start, corner, end]
const m = (a: { latitude: number; longitude: number }, b: typeof a) => distanceKm(a, b) * 1000

describe('dotsAlong', () => {
  it('espalha bolinhas igualmente espaçadas, inclusive depois da curva', () => {
    const dots = dotsAlong(path, 20)

    // ~310 m / 20 m ≈ 15 bolinhas
    expect(dots.length).toBeGreaterThanOrEqual(14)
    expect(dots.length).toBeLessThanOrEqual(16)
    for (let i = 1; i < dots.length; i++) {
      // Na curva a distância em linha reta fica um pouco menor que 20 m
      expect(m(dots[i - 1]!, dots[i]!)).toBeGreaterThan(14)
      expect(m(dots[i - 1]!, dots[i]!)).toBeLessThan(21)
    }
  })

  it('caminho muito curto não tem bolinhas', () => {
    expect(dotsAlong([start, { latitude: -25.43, longitude: -49.27995 }], 20)).toEqual([])
  })
})

describe('remainingDots', () => {
  const dots = dotsAlong(path, 20)

  it('no início, todas as bolinhas faltam', () => {
    expect(remainingDots(dots, start, end)).toHaveLength(dots.length)
  })

  it('andando pelo caminho, as bolinhas de trás são "comidas"', () => {
    const halfway = remainingDots(dots, corner, end)
    expect(halfway.length).toBeLessThan(dots.length / 2 + 2)
    expect(remainingDots(dots, end, end)).toHaveLength(0)
  })
})

describe('remainingMeters', () => {
  it('soma o caminho que falta até o material', () => {
    const dots = dotsAlong(path, 20)
    const total = remainingMeters(remainingDots(dots, start, end), start, end)

    expect(total).toBeGreaterThan(300)
    expect(total).toBeLessThan(320)
  })
})

describe('isOffRoute', () => {
  it('detecta quando a pessoa sai do caminho', () => {
    const dots = dotsAlong(path, 20)

    expect(isOffRoute(dots, corner)).toBe(false)
    expect(isOffRoute(dots, { latitude: -25.432, longitude: -49.279 })).toBe(true)
  })
})

describe('bearing', () => {
  it.each([
    [start, corner, 90], // leste
    [corner, end, 0], // norte
    [corner, start, 270], // oeste
  ])('direção correta', (a, b, expected) => {
    expect(bearing(a, b)).toBeCloseTo(expected, 0)
  })
})

describe('navigationLinks', () => {
  it('monta os links do Google Maps e do Waze com o destino', () => {
    expect(navigationLinks(end)).toEqual({
      googleMaps: 'https://www.google.com/maps/dir/?api=1&destination=-25.429,-49.278',
      waze: 'https://waze.com/ul?ll=-25.429,-49.278&navigate=yes',
    })
  })
})

describe('dotSpacingMeters', () => {
  it('no zoom 15 em Curitiba, ~4,3 m por pixel → ~77 m entre bolinhas', () => {
    expect(metersPerPixel(15, -25.43)).toBeCloseTo(4.31, 1)
    expect(dotSpacingMeters(15, -25.43)).toBeCloseTo(77.6, 0)
  })

  it('afastar o mapa (zoom menor) espaça mais as bolinhas; aproximar, menos', () => {
    expect(dotSpacingMeters(12, -25.43)).toBeGreaterThan(dotSpacingMeters(15, -25.43) * 7)
    expect(dotSpacingMeters(18, -25.43)).toBeLessThan(dotSpacingMeters(15, -25.43))
  })

  it('nunca fica menor que 8 m (zoom máximo)', () => {
    expect(dotSpacingMeters(22, -25.43)).toBe(8)
  })
})
