import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './helpers.js'

describe('GET /api/categories', () => {
  it('lista as categorias na ordem de exibição, com "Outros" por último', async () => {
    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.body.categories.map((c: { name: string }) => c.name)).toEqual([
      'Papel / Papelão',
      'Plástico',
      'Metal',
      'Vidro',
      'Eletrônicos',
      'Doação',
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

describe('categoria Doação', () => {
  it('tem subcategorias para itens reaproveitáveis', async () => {
    const res = await request(app).get('/api/categories')
    const doacao = res.body.categories.find((c: { name: string }) => c.name === 'Doação')

    expect(doacao.subcategories.map((s: { name: string }) => s.name)).toEqual([
      'Móveis',
      'Roupas',
      'Calçados',
      'Eletrodomésticos',
      'Brinquedos',
      'Livros',
      'Outros',
    ])
  })
})
