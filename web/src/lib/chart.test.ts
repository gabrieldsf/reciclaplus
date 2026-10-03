import { describe, expect, it } from 'vitest'
import { formatHours, formatPercent, formatWeek, niceMax, plural } from './chart'

describe('niceMax', () => {
  it.each([
    [0, 4],
    [3, 4],
    [5, 6],
    [7, 10],
    [11, 20],
    [23, 40],
    [50, 60],
    [130, 200],
  ])('%s → %s', (value, expected) => {
    expect(niceMax(value)).toBe(expected)
    expect(Number.isInteger(niceMax(value) / 2)).toBe(true)
  })
})

describe('formatHours', () => {
  it.each([
    [null, '—'],
    [0.25, '15 min'],
    [5.4, '5 h'],
    [47, '47 h'],
    [72, '3 dias'],
  ])('%s → %s', (hours, expected) => {
    expect(formatHours(hours)).toBe(expected)
  })
})

describe('formatPercent / formatWeek', () => {
  it('formata taxa e semana', () => {
    expect(formatPercent(0.254)).toBe('25%')
    expect(formatPercent(null)).toBe('—')
    expect(formatWeek('2026-09-28')).toBe('28/09')
    expect(plural(1, 'empresa', 'empresas')).toBe('1 empresa')
    expect(plural(0, 'empresa', 'empresas')).toBe('0 empresas')
  })
})
