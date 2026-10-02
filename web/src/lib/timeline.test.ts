import { describe, expect, it } from 'vitest'
import { buildTimeline } from './timeline'
import type { Collection, Occurrence } from './types'

const owner = { id: 'u1', name: 'Maria', userType: 'PERSON' as const }
const collector = { id: 'u2', name: 'João', userType: 'PERSON' as const }

function occurrence(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    id: 'o1',
    description: null,
    estimatedQuantity: null,
    latitude: 0,
    longitude: 0,
    photoUrl: null,
    status: 'AVAILABLE',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    category: { id: 1, name: 'Metal' },
    subcategory: null,
    user: owner,
    collection: null,
    ...overrides,
  }
}

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'c1',
    acceptedAt: '2026-10-01T11:00:00Z',
    completedAt: null,
    cancelledAt: null,
    collectedQuantity: null,
    observation: null,
    collector,
    ...overrides,
  }
}

const keys = (o: Occurrence) => buildTimeline(o).map((e) => e.key)

describe('buildTimeline', () => {
  it('disponível: só o registro', () => {
    expect(keys(occurrence())).toEqual(['created'])
  })

  it('em coleta: registro e coleta assumida', () => {
    const o = occurrence({ status: 'IN_COLLECTION', collection: collection() })
    expect(keys(o)).toEqual(['created', 'claimed'])
  })

  it('coletada: registro, assumida e coletada, em ordem', () => {
    const o = occurrence({
      status: 'COLLECTED',
      collection: collection({ completedAt: '2026-10-01T12:00:00Z' }),
    })
    const events = buildTimeline(o)
    expect(events.map((e) => e.key)).toEqual(['created', 'claimed', 'collected'])
    expect(events.map((e) => e.at)).toEqual([...events.map((e) => e.at)].sort())
  })

  it('cancelada sem coleta usa updatedAt como data do cancelamento', () => {
    const o = occurrence({ status: 'CANCELLED', updatedAt: '2026-10-02T09:00:00Z' })
    expect(buildTimeline(o).at(-1)).toEqual({
      key: 'cancelled',
      label: 'Ocorrência cancelada',
      at: '2026-10-02T09:00:00Z',
    })
  })

  it('cancelada durante a coleta usa a data de cancelamento da coleta', () => {
    const o = occurrence({
      status: 'CANCELLED',
      collection: collection({ cancelledAt: '2026-10-01T13:00:00Z' }),
    })
    expect(keys(o)).toEqual(['created', 'claimed', 'cancelled'])
    expect(buildTimeline(o).at(-1)?.at).toBe('2026-10-01T13:00:00Z')
  })

  it('chama de "você" o usuário que está vendo', () => {
    const o = occurrence({ status: 'IN_COLLECTION', collection: collection() })
    expect(buildTimeline(o, 'u2').map((e) => e.label)).toEqual([
      'Registrada por Maria',
      'Coleta assumida por você',
    ])
  })
})
