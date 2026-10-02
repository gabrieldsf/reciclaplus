import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { app, auth, createOccurrence, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

const post = (path: string, token: string, body: object = {}) =>
  request(app).post(path).set(auth(token)).send(body)

const myOccurrences = (token: string) => request(app).get('/api/me/occurrences').set(auth(token))

const myCollections = (token: string) => request(app).get('/api/me/collections').set(auth(token))

describe('GET /api/me/occurrences', () => {
  it('lista só as ocorrências do usuário, em todos os status', async () => {
    const maria = await registerUser()
    const joao = await registerUser()
    const available = await createOccurrence(maria.token)
    const cancelled = await createOccurrence(maria.token)
    await post(`/api/occurrences/${cancelled.body.occurrence.id}/cancel`, maria.token)
    await createOccurrence(joao.token)

    const res = await myOccurrences(maria.token)

    expect(res.status).toBe(200)
    const byId = Object.fromEntries(
      res.body.occurrences.map((o: { id: string; status: string }) => [o.id, o.status]),
    )
    expect(byId).toEqual({
      [available.body.occurrence.id]: 'AVAILABLE',
      [cancelled.body.occurrence.id]: 'CANCELLED',
    })
  })

  it('ordena das mais recentes para as mais antigas', async () => {
    const { token } = await registerUser()
    const older = await createOccurrence(token)
    const newer = await createOccurrence(token)
    await prisma.occurrence.update({
      where: { id: older.body.occurrence.id },
      data: { createdAt: new Date('2026-01-01T10:00:00Z') },
    })

    const res = await myOccurrences(token)

    expect(res.body.occurrences.map((o: { id: string }) => o.id)).toEqual([
      newer.body.occurrence.id,
      older.body.occurrence.id,
    ])
  })

  it('exige autenticação', async () => {
    expect((await request(app).get('/api/me/occurrences')).status).toBe(401)
    expect((await request(app).get('/api/me/collections')).status).toBe(401)
  })
})

describe('GET /api/me/collections', () => {
  it('lista as coletas do usuário: em andamento, concluídas e canceladas pelo dono', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const other = await registerUser()
    const inProgress = await createOccurrence(owner.token)
    const done = await createOccurrence(owner.token)
    const cancelled = await createOccurrence(owner.token)
    const notMine = await createOccurrence(owner.token)
    const id = (r: typeof inProgress) => r.body.occurrence.id as string

    await post(`/api/occurrences/${id(inProgress)}/claim`, collector.token)
    await post(`/api/occurrences/${id(done)}/claim`, collector.token)
    await post(`/api/occurrences/${id(done)}/complete`, collector.token, {
      collectedQuantity: '10 kg',
    })
    await post(`/api/occurrences/${id(cancelled)}/claim`, collector.token)
    await post(`/api/occurrences/${id(cancelled)}/cancel`, owner.token)
    await post(`/api/occurrences/${id(notMine)}/claim`, other.token)

    const res = await myCollections(collector.token)

    expect(res.status).toBe(200)
    const byOccurrence = Object.fromEntries(
      res.body.collections.map(
        (c: {
          occurrence: { id: string; status: string }
          completedAt: string | null
          cancelledAt: string | null
        }) => [
          c.occurrence.id,
          { status: c.occurrence.status, completed: !!c.completedAt, cancelled: !!c.cancelledAt },
        ],
      ),
    )
    expect(byOccurrence).toEqual({
      [id(inProgress)]: { status: 'IN_COLLECTION', completed: false, cancelled: false },
      [id(done)]: { status: 'COLLECTED', completed: true, cancelled: false },
      [id(cancelled)]: { status: 'CANCELLED', completed: false, cancelled: true },
    })
    const doneCollection = res.body.collections.find(
      (c: { occurrence: { id: string } }) => c.occurrence.id === id(done),
    )
    expect(doneCollection.collectedQuantity).toBe('10 kg')
    expect(doneCollection.occurrence.user).not.toHaveProperty('email')
  })
})

describe('critério de aceite: o histórico registra as ações realizadas', () => {
  it('registrar → assumir → finalizar aparece no histórico dos dois usuários', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const created = await createOccurrence(owner.token)
    const id = created.body.occurrence.id

    await post(`/api/occurrences/${id}/claim`, collector.token)
    await post(`/api/occurrences/${id}/complete`, collector.token, { observation: 'ok' })

    const ownerHistory = (await myOccurrences(owner.token)).body.occurrences
    expect(ownerHistory).toHaveLength(1)
    expect(ownerHistory[0]).toMatchObject({
      id,
      status: 'COLLECTED',
      createdAt: expect.any(String),
      collection: {
        acceptedAt: expect.any(String),
        completedAt: expect.any(String),
        observation: 'ok',
        collector: { id: collector.res.body.user.id },
      },
    })

    const collectorHistory = (await myCollections(collector.token)).body.collections
    expect(collectorHistory).toHaveLength(1)
    expect(collectorHistory[0]).toMatchObject({
      occurrence: { id, status: 'COLLECTED' },
      completedAt: expect.any(String),
    })

    // Linha do tempo coerente
    const { createdAt, collection } = ownerHistory[0]
    expect(new Date(createdAt) <= new Date(collection.acceptedAt)).toBe(true)
    expect(new Date(collection.acceptedAt) <= new Date(collection.completedAt)).toBe(true)
  })
})
