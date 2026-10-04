import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from '../components/UserAvatar'
import { VerifyEmailLink } from '../components/VerifyEmailLink'
import { useCurrentPosition } from '../hooks/useCurrentPosition'
import { api, ApiError } from '../lib/api'
import { categoryStyle } from '../lib/categories'
import { formatDateTime } from '../lib/format'
import { formatDistance, getLastLocation, sortByDistance } from '../lib/geo'
import type { Occurrence } from '../lib/types'

// Tela "Coletar": ocorrências disponíveis, da mais próxima para a mais distante
export function CollectPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { position, locating, error: locationError, locate } = useCurrentPosition({ auto: true })
  const [lastLocation] = useState(getLastLocation)
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null)
  const [error, setError] = useState('')
  const [claimingId, setClaimingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<{ occurrences: Occurrence[] }>('/occurrences')
      .then((res) => active && setOccurrences(res.occurrences))
      .catch((err: Error) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [])

  // Enquanto a localização atual não chega, usa a última conhecida
  const origin = position ?? lastLocation
  const sorted = occurrences ? sortByDistance(occurrences, origin) : []

  async function handleClaim(occurrence: Occurrence) {
    if (!window.confirm('Assumir esta coleta? Ela deixará de aparecer para outras pessoas.')) return
    setError('')
    setClaimingId(occurrence.id)
    try {
      await api(`/occurrences/${occurrence.id}/claim`, { method: 'POST' })
      // Nos detalhes o coletor acompanha e, depois, finaliza a coleta
      navigate(`/ocorrencias/${occurrence.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado')
      // Alguém assumiu antes: tira da lista
      if (err instanceof ApiError && err.status === 409) {
        setOccurrences((list) => list?.filter((o) => o.id !== occurrence.id) ?? null)
      }
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold">Coletar</h1>
        <p className="text-brand-700">
          {position
            ? 'Disponíveis para coleta, da mais próxima para a mais distante.'
            : lastLocation
              ? 'Ordenadas a partir da sua última localização conhecida.'
              : 'Disponíveis para coleta, das mais recentes para as mais antigas.'}
        </p>
      </header>

      {!position && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
          <span className={locationError ? 'text-red-700' : 'text-brand-700'}>
            {locating
              ? 'Obtendo sua localização…'
              : locationError || 'Ative a localização para ver as mais próximas primeiro.'}
          </span>
          {!locating && (
            <button
              type="button"
              onClick={() => void locate()}
              className="rounded-lg border-2 border-brand-700 px-3 py-1.5 font-semibold hover:bg-brand-100"
            >
              <span aria-hidden="true">📍 </span>Usar minha localização
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}

      {!occurrences && !error && <p className="text-brand-700">Carregando…</p>}

      {occurrences && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-brand-700">Nenhuma ocorrência disponível no momento.</p>
          <Link
            to="/informar"
            className="rounded-xl bg-brand-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-900"
          >
            Informar reciclável
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          <p className="text-sm text-brand-700">
            {sorted.length === 1 ? '1 ocorrência' : `${sorted.length} ocorrências`}
          </p>
          <ul className="flex flex-col gap-3">
            {sorted.map(({ item: occurrence, distance }) => {
              const { emoji, color } = categoryStyle(occurrence.category.name)
              const isOwner = user?.id === occurrence.user.id
              return (
                <li
                  key={occurrence.id}
                  aria-label={`${occurrence.category.name}${distance !== null ? `, a ${formatDistance(distance)}` : ''}`}
                  className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      {emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">
                          {occurrence.category.name}
                          {occurrence.subcategory && (
                            <span className="font-normal text-brand-700">
                              {' '}
                              · {occurrence.subcategory.name}
                            </span>
                          )}
                        </p>
                        {distance !== null && (
                          <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-bold whitespace-nowrap">
                            {formatDistance(distance)}
                          </span>
                        )}
                      </div>
                      {occurrence.estimatedQuantity && (
                        <p className="text-sm">Quantidade: {occurrence.estimatedQuantity}</p>
                      )}
                      {occurrence.description && (
                        <p className="line-clamp-2 text-sm text-brand-700">
                          {occurrence.description}
                        </p>
                      )}
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-700">
                        <UserAvatar user={occurrence.user} size="xs" />
                        <span>
                          {isOwner ? 'Informada por você' : `Informada por ${occurrence.user.name}`}{' '}
                          · {formatDateTime(occurrence.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/ocorrencias/${occurrence.id}`}
                      className="flex-1 rounded-xl border-2 border-brand-700 px-4 py-2 text-center font-semibold hover:bg-brand-100"
                    >
                      Ver detalhes
                    </Link>
                    {isOwner ? (
                      <span className="flex flex-1 items-center justify-center rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-700">
                        Sua ocorrência
                      </span>
                    ) : user && !user.emailVerified ? (
                      <VerifyEmailLink className="flex-1 rounded-xl bg-brand-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-900">
                        Confirme o e-mail para coletar
                      </VerifyEmailLink>
                    ) : user ? (
                      <button
                        type="button"
                        onClick={() => void handleClaim(occurrence)}
                        disabled={claimingId !== null}
                        className="flex-1 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
                      >
                        {claimingId === occurrence.id ? 'Assumindo…' : 'Coletar'}
                      </button>
                    ) : (
                      <Link
                        to="/entrar"
                        state={{ from: location.pathname }}
                        className="flex-1 rounded-xl bg-brand-700 px-4 py-2 text-center font-semibold text-white hover:bg-brand-900"
                      >
                        Entrar para coletar
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
