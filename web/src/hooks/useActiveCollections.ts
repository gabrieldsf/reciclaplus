import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { distanceKm } from '../lib/geo'
import type { LatLng, MyCollection } from '../lib/types'

const SELECTED_KEY = 'reciclaplus:active-collection'

function readSaved() {
  try {
    return localStorage.getItem(SELECTED_KEY)
  } catch {
    return null
  }
}

// Coletas em andamento do usuário logado e qual delas a rota do mapa está seguindo.
// Sem escolha salva (ou se a salva já terminou), segue a mais próxima.
export function useActiveCollections(position: LatLng | null) {
  const { user } = useAuth()
  const [collections, setCollections] = useState<MyCollection[]>([])
  const [savedId, setSavedId] = useState<string | null>(readSaved)

  useEffect(() => {
    if (!user) return
    let active = true
    api<{ collections: MyCollection[] }>('/me/collections?active=true')
      .then((res) => active && setCollections(res.collections))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user])

  const list = user ? collections : []
  const saved = list.find((c) => c.id === savedId)
  const nearest = position
    ? [...list].sort(
        (a, b) => distanceKm(position, a.occurrence) - distanceKm(position, b.occurrence),
      )[0]
    : list[0]
  const selected = saved ?? nearest ?? null

  const select = useCallback((id: string) => {
    setSavedId(id)
    try {
      localStorage.setItem(SELECTED_KEY, id)
    } catch {
      // armazenamento indisponível: a escolha vale só nesta visita
    }
  }, [])

  return { collections: list, selected, select }
}
