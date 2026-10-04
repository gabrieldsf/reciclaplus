// Desistir da coleta (coletor) e liberar coleta parada (dono)
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { RELEASE_AFTER_HOURS } from '../src/modules/collections/collections.service.js'
import { app, auth, createOccurrence, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

// Ocorrência já assumida pelo coletor
async function setup() {
  const owner = await registerUser()
  const collector = await registerUser()
  const created = await createOccurrence(owner.token)
  const id = created.body.occurrence.id as string
  await request(app).post(`/api/occurrences/${id}/claim`).set(auth(collector.token))
  return { owner, collector, id }
}

const post = (id: string, action: string, token: string) =>
  request(app).post(`/api/occurrences/${id}/${action}`).set(auth(token))

// Faz a coleta em andamento parecer assumida há `hours` horas
async function ageCollection(occurrenceId: string, hours: number) {
  await prisma.collection.updateMany({
    where: { occurrenceId },
    data: { acceptedAt: new Date(Date.now() - hours * 3_600_000) },
  })
}

describe('POST /api/occurrences/:id/give-up', () => {
  it('o coletor desiste: a ocorrência volta a ficar disponível e a coleta fica registrada', async () => {
    const { collector, id } = await setup()

    const res = await post(id, 'give-up', collector.token)

    expect(res.status).toBe(200)
    expect(res.body.occurrence.status).toBe('AVAILABLE')
    expect(res.body.occurrence.collection).toBeNull()
    expect(res.body.occurrence.releasedCollections).toEqual([
      expect.objectContaining({
        releaseReason: 'GAVE_UP',
        collector: expect.objectContaining({ id: collector.res.body.user.id }),
      }),
    ])
  })

  it('outra pessoa pode assumir depois; o coletor que desistiu não conta mais no limite', async () => {
    const { collector, id } = await setup()
    await post(id, 'give-up', collector.token)
    const other = await registerUser()

    const res = await post(id, 'claim', other.token)

    expect(res.status).toBe(200)
    expect(res.body.occurrence.collection.collector.id).toBe(other.res.body.user.id)
    expect(res.body.occurrence.releasedCollections).toHaveLength(1)

    const active = await request(app)
      .get('/api/me/collections?active=true')
      .set(auth(collector.token))
    expect(active.body.collections).toHaveLength(0)
  })

  it('aparece no histórico do coletor como desistência', async () => {
    const { collector, id } = await setup()
    await post(id, 'give-up', collector.token)

    const res = await request(app).get('/api/me/collections').set(auth(collector.token))

    expect(res.body.collections[0]).toMatchObject({ releaseReason: 'GAVE_UP', completedAt: null })
    expect(res.body.collections[0].releasedAt).not.toBeNull()
  })

  it('somente quem assumiu pode desistir', async () => {
    const { owner, id } = await setup()
    const stranger = await registerUser()

    expect((await post(id, 'give-up', stranger.token)).status).toBe(403)
    expect((await post(id, 'give-up', owner.token)).status).toBe(403)
  })

  it('depois de finalizada, não dá para desistir', async () => {
    const { collector, id } = await setup()
    await post(id, 'complete', collector.token)

    const res = await post(id, 'give-up', collector.token)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Não há coleta em andamento para esta ocorrência')
  })

  it('quem desistiu não consegue mais finalizar', async () => {
    const { collector, id } = await setup()
    await post(id, 'give-up', collector.token)

    expect((await post(id, 'complete', collector.token)).status).toBe(409)
  })

  it('desistir e finalizar ao mesmo tempo: só um vence', async () => {
    const { collector, id } = await setup()

    const results = await Promise.all([
      post(id, 'give-up', collector.token),
      post(id, 'complete', collector.token),
    ])

    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    const stored = await prisma.occurrence.findUniqueOrThrow({ where: { id } })
    const collection = await prisma.collection.findFirstOrThrow({ where: { occurrenceId: id } })
    // Estado coerente: ou coletada, ou disponível com a coleta desfeita
    if (stored.status === 'COLLECTED') expect(collection.releasedAt).toBeNull()
    else expect(collection.completedAt).toBeNull()
  })
})

describe('POST /api/occurrences/:id/release', () => {
  it(`o dono libera uma coleta parada há mais de ${RELEASE_AFTER_HOURS} h`, async () => {
    const { owner, id } = await setup()
    await ageCollection(id, RELEASE_AFTER_HOURS + 1)

    const res = await post(id, 'release', owner.token)

    expect(res.status).toBe(200)
    expect(res.body.occurrence.status).toBe('AVAILABLE')
    expect(res.body.occurrence.releasedCollections[0].releaseReason).toBe('RELEASED_BY_OWNER')
  })

  it('antes do prazo, não dá para liberar', async () => {
    const { owner, id } = await setup()

    const res = await post(id, 'release', owner.token)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe(
      `A coleta só pode ser liberada ${RELEASE_AFTER_HOURS} h depois de assumida`,
    )
  })

  it('somente o dono pode liberar', async () => {
    const { collector, id } = await setup()
    await ageCollection(id, RELEASE_AFTER_HOURS + 1)
    const stranger = await registerUser()

    expect((await post(id, 'release', stranger.token)).status).toBe(403)
    expect((await post(id, 'release', collector.token)).status).toBe(403)
  })

  it('o coletor liberado não consegue mais finalizar', async () => {
    const { owner, collector, id } = await setup()
    await ageCollection(id, RELEASE_AFTER_HOURS + 1)
    await post(id, 'release', owner.token)

    expect((await post(id, 'complete', collector.token)).status).toBe(409)
  })

  it('ocorrência sem coleta em andamento: 409', async () => {
    const owner = await registerUser()
    const created = await createOccurrence(owner.token)

    const res = await post(created.body.occurrence.id, 'release', owner.token)

    expect(res.status).toBe(409)
  })
})
