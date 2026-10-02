import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Category } from '../lib/types'

// As categorias quase nunca mudam: busca uma vez e reaproveita entre telas
let cache: Promise<Category[]> | null = null

function loadCategories() {
  cache ??= api<{ categories: Category[] }>('/categories')
    .then((res) => res.categories)
    .catch((err) => {
      cache = null
      throw err
    })
  return cache
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadCategories()
      .then((data) => active && setCategories(data))
      .catch((err: Error) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [])

  return { categories, error }
}
