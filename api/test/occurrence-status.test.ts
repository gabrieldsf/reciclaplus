import { describe, expect, it } from 'vitest'
import {
  canTransition,
  statusesThatCanReach,
} from '../src/modules/occurrences/occurrence-status.js'

describe('máquina de estados da ocorrência', () => {
  it.each([
    ['AVAILABLE', 'IN_COLLECTION'],
    ['IN_COLLECTION', 'COLLECTED'],
    ['AVAILABLE', 'CANCELLED'],
    ['IN_COLLECTION', 'CANCELLED'],
    // Desistência do coletor ou liberação pelo dono
    ['IN_COLLECTION', 'AVAILABLE'],
  ] as const)('permite %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  it.each([
    ['AVAILABLE', 'COLLECTED'],
    ['COLLECTED', 'IN_COLLECTION'],
    ['COLLECTED', 'AVAILABLE'],
    ['COLLECTED', 'CANCELLED'],
    ['CANCELLED', 'AVAILABLE'],
    ['CANCELLED', 'IN_COLLECTION'],
  ] as const)('bloqueia %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('RN04 — somente AVAILABLE pode ser assumida', () => {
    expect(statusesThatCanReach('IN_COLLECTION')).toEqual(['AVAILABLE'])
  })

  it('só uma coleta em andamento volta a ficar disponível', () => {
    expect(statusesThatCanReach('AVAILABLE')).toEqual(['IN_COLLECTION'])
  })

  it('RN08 — COLLECTED é um estado final', () => {
    expect(statusesThatCanReach('COLLECTED')).toEqual(['IN_COLLECTION'])
  })
})
