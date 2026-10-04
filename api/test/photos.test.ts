import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { app, auth, createOccurrence, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

// Assinatura de JPEG + alguns bytes: o servidor só confere a assinatura
const FAKE_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('foto')])

async function upload(token: string, bytes: Buffer = FAKE_JPEG) {
  return request(app)
    .post('/api/photos')
    .set(auth(token))
    .set('Content-Type', 'image/jpeg')
    .send(bytes)
}

describe('POST /api/photos', () => {
  it('envia a foto e devolve id e endereço; a foto é servida com cache longo', async () => {
    const { token } = await registerUser()

    const res = await upload(token)

    expect(res.status).toBe(201)
    expect(res.body.photo.url).toBe(`/api/photos/${res.body.photo.id}`)
    const photo = await request(app).get(res.body.photo.url)
    expect(photo.status).toBe(200)
    expect(photo.headers['content-type']).toBe('image/jpeg')
    expect(photo.headers['cache-control']).toContain('immutable')
    expect(Buffer.from(photo.body).equals(FAKE_JPEG)).toBe(true)
  })

  it('recusa o que não é imagem e arquivo grande demais', async () => {
    const { token } = await registerUser()

    expect((await upload(token, Buffer.from('não é imagem'))).status).toBe(400)
    expect((await upload(token, Buffer.concat([FAKE_JPEG, Buffer.alloc(700 * 1024)]))).status).toBe(
      413,
    )
  })

  it('exige login e e-mail confirmado', async () => {
    const unverified = await registerUser({}, { verified: false })

    expect((await request(app).post('/api/photos').send(FAKE_JPEG)).status).toBe(401)
    expect((await upload(unverified.token)).status).toBe(403)
  })

  it('apaga fotos esquecidas (nunca usadas há mais de 24 h) da mesma pessoa', async () => {
    const { token } = await registerUser()
    const old = (await upload(token)).body.photo.id
    await prisma.photo.update({
      where: { id: old },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    })

    await upload(token)

    expect(await prisma.photo.findUnique({ where: { id: old } })).toBeNull()
  })
})

describe('foto ao informar', () => {
  it('a ocorrência criada com a foto devolve photoUrl', async () => {
    const { token } = await registerUser()
    const photo = (await upload(token)).body.photo

    const res = await createOccurrence(token, { photoId: photo.id })

    expect(res.status).toBe(201)
    expect(res.body.occurrence.photoUrl).toBe(photo.url)
    expect(res.body.occurrence).not.toHaveProperty('photoId')
  })

  it('não aceita foto de outra pessoa nem a mesma foto em duas ocorrências', async () => {
    const maria = await registerUser()
    const joao = await registerUser()
    const mariaPhoto = (await upload(maria.token)).body.photo.id

    const stolen = await createOccurrence(joao.token, { photoId: mariaPhoto })
    expect(stolen.status).toBe(400)
    expect(stolen.body.message).toBe('Foto inválida. Envie a foto novamente.')

    expect((await createOccurrence(maria.token, { photoId: mariaPhoto })).status).toBe(201)
    expect((await createOccurrence(maria.token, { photoId: mariaPhoto })).status).toBe(400)
  })

  it('na edição, o dono troca ou remove a foto', async () => {
    const { token } = await registerUser()
    const first = (await upload(token)).body.photo
    const created = await createOccurrence(token, { photoId: first.id })
    const id = created.body.occurrence.id
    const second = (await upload(token)).body.photo

    // Mantendo a mesma foto (ex.: editou só a quantidade) também funciona
    const same = await request(app)
      .patch(`/api/occurrences/${id}`)
      .set(auth(token))
      .send({ photoId: first.id, estimatedQuantity: '1 kg' })
    expect(same.status).toBe(200)

    const swapped = await request(app)
      .patch(`/api/occurrences/${id}`)
      .set(auth(token))
      .send({ photoId: second.id })
    expect(swapped.body.occurrence.photoUrl).toBe(second.url)

    const removed = await request(app)
      .patch(`/api/occurrences/${id}`)
      .set(auth(token))
      .send({ photoId: null })
    expect(removed.body.occurrence.photoUrl).toBeNull()
  })
})

describe('foto ao finalizar a coleta', () => {
  it('a coleta finalizada guarda a foto e ela aparece na ocorrência e no histórico', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const created = await createOccurrence(owner.token)
    const id = created.body.occurrence.id
    await request(app).post(`/api/occurrences/${id}/claim`).set(auth(collector.token))
    const photo = (await upload(collector.token)).body.photo

    const res = await request(app)
      .post(`/api/occurrences/${id}/complete`)
      .set(auth(collector.token))
      .send({ photoId: photo.id, collectedQuantity: '10 kg' })

    expect(res.status).toBe(200)
    expect(res.body.occurrence.collection.photoUrl).toBe(photo.url)

    const ownerHistory = await request(app).get('/api/me/occurrences').set(auth(owner.token))
    expect(ownerHistory.body.occurrences[0].collection.photoUrl).toBe(photo.url)
    const collectorHistory = await request(app)
      .get('/api/me/collections')
      .set(auth(collector.token))
    expect(collectorHistory.body.collections[0].photoUrl).toBe(photo.url)
  })

  it('o coletor não pode usar a foto do dono', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    const ownerPhoto = (await upload(owner.token)).body.photo.id
    const created = await createOccurrence(owner.token)
    const id = created.body.occurrence.id
    await request(app).post(`/api/occurrences/${id}/claim`).set(auth(collector.token))

    const res = await request(app)
      .post(`/api/occurrences/${id}/complete`)
      .set(auth(collector.token))
      .send({ photoId: ownerPhoto })

    expect(res.status).toBe(400)
  })
})
