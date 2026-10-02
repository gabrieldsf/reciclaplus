import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Occurrence } from '../lib/types'

type State = { id: string | undefined; occurrence: Occurrence | null; error: string }

export function useOccurrence(id: string | undefined) {
  const [state, setState] = useState<State>({ id: undefined, occurrence: null, error: '' })

  useEffect(() => {
    if (!id) return
    let active = true
    api<{ occurrence: Occurrence }>(`/occurrences/${id}`)
      .then((res) => active && setState({ id, occurrence: res.occurrence, error: '' }))
      .catch((err: Error) => active && setState({ id, occurrence: null, error: err.message }))
    return () => {
      active = false
    }
  }, [id])

  // Atualiza o estado local após uma ação (ex.: cancelar) que devolve a ocorrência
  const replace = useCallback(
    (next: Occurrence) => setState((s) => ({ ...s, occurrence: next })),
    [],
  )

  // Enquanto a resposta do id atual não chega, os dados exibidos seriam de outro id
  const loading = state.id !== id
  return {
    occurrence: loading ? null : state.occurrence,
    error: loading ? '' : state.error,
    loading,
    replace,
  }
}
