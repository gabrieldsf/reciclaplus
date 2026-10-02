import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './helpers.js'

describe('GET /api/categories', () => {
  it('lista as 6 categorias do MVP com suas subcategorias', async () => {
    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.body.categories.map((c: { name: string }) => c.name)).toEqual([
      'Papel / Papelão',
      'Plástico',
      'Metal',
      'Vidro',
      'Eletrônicos',
      'Outros',
    ])

    const plastic = res.body.categories.find((c: { name: string }) => c.name === 'Plástico')
    expect(plastic.subcategories.map((s: { name: string }) => s.name)).toEqual([
      'Garrafas PET',
      'Embalagens',
      'Plástico rígido',
      'Outros',
    ])
  })
})
