import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app, auth, createOccurrence, registerUser, resetDatabase } from './helpers.js'

beforeEach(resetDatabase)

// Assinatura de PNG + alguns bytes: o servidor só confere a assinatura
const FAKE_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('conteudo-da-imagem'),
])

const uploadPhoto = (token: string, bytes: Buffer, type = 'image/png') =>
  request(app).put('/api/me/avatar/photo').set(auth(token)).set('Content-Type', type).send(bytes)

describe('avatar pronto', () => {
  it('escolhe um avatar e ele aparece no usuário logado', async () => {
    const { token } = await registerUser()

    const res = await request(app)
      .put('/api/me/avatar')
      .set(auth(token))
      .send({ preset: 'garrafa' })

    expect(res.status).toBe(200)
    expect(res.body.user.avatarUrl).toBe('/avatars/garrafa.svg')
    const me = await request(app).get('/api/auth/me').set(auth(token))
    expect(me.body.user.avatarUrl).toBe('/avatars/garrafa.svg')
    // Campos internos não vazam
    expect(me.body.user).not.toHaveProperty('avatarPreset')
  })

  it('recusa avatar que não existe', async () => {
    const { token } = await registerUser()

    const res = await request(app).put('/api/me/avatar').set(auth(token)).send({ preset: 'hacker' })

    expect(res.status).toBe(400)
  })

  it('sem avatar, avatarUrl é null', async () => {
    const { res } = await registerUser()

    expect(res.body.user.avatarUrl).toBeNull()
  })
})

describe('foto de perfil', () => {
  it('envia uma foto e ela é servida com cache por versão', async () => {
    const { token, res: userRes } = await registerUser()

    const res = await uploadPhoto(token, FAKE_PNG)

    expect(res.status).toBe(200)
    const url: string = res.body.user.avatarUrl
    expect(url).toMatch(new RegExp(`^/api/users/${userRes.body.user.id}/avatar\\?v=\\d+$`))

    const photo = await request(app).get(url)
    expect(photo.status).toBe(200)
    expect(photo.headers['content-type']).toBe('image/png')
    expect(photo.headers['cache-control']).toContain('immutable')
    expect(Buffer.from(photo.body).equals(FAKE_PNG)).toBe(true)
  })

  it('detecta o tipo pela assinatura do arquivo, não pelo cabeçalho', async () => {
    const { token } = await registerUser()

    // Diz que é JPEG, mas o conteúdo é PNG
    await uploadPhoto(token, FAKE_PNG, 'image/jpeg')
    const me = await request(app).get('/api/auth/me').set(auth(token))
    const photo = await request(app).get(me.body.user.avatarUrl)

    expect(photo.headers['content-type']).toBe('image/png')
  })

  it('recusa arquivo que não é imagem', async () => {
    const { token } = await registerUser()

    const res = await uploadPhoto(token, Buffer.from('<script>alert(1)</script>'), 'image/png')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Envie uma imagem JPEG, PNG ou WebP')
  })

  it('recusa arquivo grande demais', async () => {
    const { token } = await registerUser()
    const big = Buffer.concat([FAKE_PNG, Buffer.alloc(400 * 1024)])

    const res = await uploadPhoto(token, big)

    expect(res.status).toBe(413)
  })

  it('escolher um avatar pronto apaga a foto enviada', async () => {
    const { token } = await registerUser()
    const upload = await uploadPhoto(token, FAKE_PNG)
    const photoUrl = upload.body.user.avatarUrl

    await request(app).put('/api/me/avatar').set(auth(token)).send({ preset: 'folha' })

    expect((await request(app).get(photoUrl)).status).toBe(404)
  })

  it('remover volta para a inicial do nome', async () => {
    const { token } = await registerUser()
    await uploadPhoto(token, FAKE_PNG)

    const res = await request(app).delete('/api/me/avatar').set(auth(token))

    expect(res.status).toBe(200)
    expect(res.body.user.avatarUrl).toBeNull()
  })

  it('exige login para alterar', async () => {
    expect((await request(app).put('/api/me/avatar').send({ preset: 'lata' })).status).toBe(401)
    expect((await request(app).put('/api/me/avatar/photo').send(FAKE_PNG)).status).toBe(401)
  })

  it('foto de usuário inexistente responde 404', async () => {
    const res = await request(app).get('/api/users/00000000-0000-4000-8000-000000000000/avatar')

    expect(res.status).toBe(404)
  })
})

describe('avatar nas ocorrências', () => {
  it('autor e coletor aparecem com avatarUrl (sem e-mail)', async () => {
    const owner = await registerUser()
    const collector = await registerUser()
    await request(app).put('/api/me/avatar').set(auth(owner.token)).send({ preset: 'arvore' })
    await uploadPhoto(collector.token, FAKE_PNG)
    const created = await createOccurrence(owner.token)
    const id = created.body.occurrence.id

    const res = await request(app).post(`/api/occurrences/${id}/claim`).set(auth(collector.token))

    expect(res.body.occurrence.user.avatarUrl).toBe('/avatars/arvore.svg')
    expect(res.body.occurrence.collection.collector.avatarUrl).toMatch(
      /^\/api\/users\/.+\/avatar\?v=/,
    )
    expect(res.body.occurrence.user).not.toHaveProperty('email')
  })
})
