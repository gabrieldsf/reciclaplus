import { describe, expect, it } from 'vitest'
import { editDistance, suggestEmail } from './email-suggest'

describe('editDistance', () => {
  it.each([
    ['gmail.com', 'gmail.com', 0],
    ['gmial.com', 'gmail.com', 2],
    ['gmail.con', 'gmail.com', 1],
    ['hotmal.com', 'hotmail.com', 1],
  ])('%s → %s = %s', (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected)
  })
})

describe('suggestEmail', () => {
  it.each([
    ['maria@gmial.com', 'maria@gmail.com'],
    ['maria@gmail.con', 'maria@gmail.com'],
    ['maria@hotmal.com', 'maria@hotmail.com'],
    ['maria@outlok.com', 'maria@outlook.com'],
    ['maria@yahoo.com.bt', 'maria@yahoo.com.br'],
  ])('%s → %s', (typed, expected) => {
    expect(suggestEmail(typed)).toBe(expected)
  })

  it.each([
    'maria@gmail.com',
    'maria@empresa.com.br',
    'maria@unifesp.br',
    'sem-arroba',
    '@gmail.com',
  ])('não sugere nada para %s', (typed) => {
    expect(suggestEmail(typed)).toBeNull()
  })
})
