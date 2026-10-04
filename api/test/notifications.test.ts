// Avisos do sininho: cada mudança na coleta avisa a outra pessoa envolvida
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { RELEASE_AFTER_HOURS } from '../src/modules/collections/collections.service.js'
import { app, auth, createOccurrence, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

async function setup() {
  const owner = await registerUser({ name: 'Maria Dona' })
  const collector = await registerUser({ name: 'João Coletor' })
  const created = await createOccurrence(owner.token)
  return { owner, collector, id: created.body.occurrence.id as string }
}

const post = (id: string, action: string, token: string) =>
  request(app).post(`/api/occurrences/${id}/${action}`).set(auth(token))

const list = (token: string) => request(app).get('/api/notifications').set(auth(token))

const types = async (token: string) =>
  (await list(token)).body.notifications.map((n: { type: string }) => n.type)

describe('avisos gerados pelas coletas', () => {
  it('o dono é avisado quando assumem e quando concluem a coleta', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)
    await post(id, 'complete', collector.token)

    const res = await list(owner.token)

    expect(res.status).toBe(200)
    expect(res.body.unreadCount).toBe(2)
    // Mais recentes primeiro
    expect(res.body.notifications.map((n: { type: string }) => n.type)).toEqual([
      'COLLECTION_COMPLETED',
      'COLLECTION_CLAIMED',
    ])
    expect(res.body.notifications[0]).toMatchObject({
      readAt: null,
      actor: { id: collector.res.body.user.id, name: 'João Coletor' },
      occurrence: { id, status: 'COLLECTED', category: { name: 'Plástico' } },
    })
    expect(res.body.notifications[0].actor).not.toHaveProperty('email')
    // Quem fez a ação não recebe aviso dela
    expect(await types(collector.token)).toEqual([])
  })

  it('o dono é avisado quando o coletor desiste', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)
    await post(id, 'give-up', collector.token)

    expect(await types(owner.token)).toEqual(['COLLECTION_GAVE_UP', 'COLLECTION_CLAIMED'])
  })

  it('o coletor é avisado quando o dono cancela durante a coleta', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)
    await post(id, 'cancel', owner.token)

    expect(await types(collector.token)).toEqual(['OCCURRENCE_CANCELLED'])
  })

  it('cancelar sem coleta em andamento não avisa ninguém', async () => {
    const { owner, id } = await setup()
    await post(id, 'cancel', owner.token)

    expect(await prisma.notification.count()).toBe(0)
  })

  it('o coletor é avisado quando o dono libera a coleta parada', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)
    await prisma.collection.updateMany({
      data: { acceptedAt: new Date(Date.now() - (RELEASE_AFTER_HOURS + 1) * 3_600_000) },
    })
    await post(id, 'release', owner.token)

    expect(await types(collector.token)).toEqual(['COLLECTION_RELEASED'])
  })

  it('uma ação recusada não gera aviso', async () => {
    const { owner, id } = await setup()
    await post(id, 'claim', owner.token) // a própria ocorrência: 403

    expect(await types(owner.token)).toEqual([])
  })
})

describe('contagem e leitura', () => {
  it('GET /unread-count devolve só o número', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)

    const res = await request(app).get('/api/notifications/unread-count').set(auth(owner.token))

    expect(res.body).toEqual({ count: 1 })
  })

  it('POST /read marca todos como lidos', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)
    await post(id, 'complete', collector.token)

    const res = await request(app).post('/api/notifications/read').set(auth(owner.token))

    expect(res.body).toEqual({ unreadCount: 0 })
    const after = await list(owner.token)
    expect(after.body.notifications.every((n: { readAt: string }) => n.readAt)).toBe(true)
  })

  it('POST /read com ids marca só esses (e só os da própria pessoa)', async () => {
    const { owner, collector, id } = await setup()
    await post(id, 'claim', collector.token)
    await post(id, 'complete', collector.token)
    const [latest] = (await list(owner.token)).body.notifications

    const res = await request(app)
      .post('/api/notifications/read')
      .set(auth(owner.token))
      .send({ ids: [latest.id] })
    expect(res.body).toEqual({ unreadCount: 1 })

    // Outra pessoa não consegue marcar avisos que não são dela
    const stranger = await registerUser()
    await request(app)
      .post('/api/notifications/read')
      .set(auth(stranger.token))
      .send({ ids: [(await list(owner.token)).body.notifications[1].id] })
    expect((await list(owner.token)).body.unreadCount).toBe(1)
  })

  it('exige login', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401)
    expect((await request(app).get('/api/notifications/unread-count')).status).toBe(401)
  })
})
