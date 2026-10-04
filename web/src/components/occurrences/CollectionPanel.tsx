import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import type { User } from '../../auth/AuthContext'
import { api, ApiError } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import type { Occurrence, UploadedPhoto } from '../../lib/types'
import { PhotoField } from '../PhotoField'
import { TextField } from '../TextField'
import { VerifyEmailLink } from '../VerifyEmailLink'

type CollectionPanelProps = {
  occurrence: Occurrence
  user: User | null
  onChange: (occurrence: Occurrence) => void
}

// Mesmo prazo da API: depois disso o dono pode liberar uma coleta parada
const RELEASE_AFTER_HOURS = 24

const primaryButton =
  'w-full rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60'

// Ações e situação da coleta, conforme o status da ocorrência e quem está vendo
export function CollectionPanel({ occurrence, user, onChange }: CollectionPanelProps) {
  const location = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Foto opcional do material coletado (enviada antes de confirmar)
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  // Momento em que a tela abriu (para saber se o dono já pode liberar a coleta)
  const [openedAt] = useState(() => Date.now())

  const { status, collection } = occurrence
  const isOwner = user?.id === occurrence.user.id
  const isCollector = Boolean(user && collection?.collector.id === user.id)
  const collectorName = isCollector ? 'você' : collection?.collector.name

  async function run(path: string, body?: object) {
    setError('')
    setBusy(true)
    try {
      const res = await api<{ occurrence: Occurrence }>(`/occurrences/${occurrence.id}/${path}`, {
        method: 'POST',
        body,
      })
      onChange(res.occurrence)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado')
      // A ocorrência pode ter mudado (ex.: outra pessoa assumiu antes): recarrega
      if (err instanceof ApiError && err.status === 409) {
        api<{ occurrence: Occurrence }>(`/occurrences/${occurrence.id}`)
          .then((res) => onChange(res.occurrence))
          .catch(() => {})
      }
    } finally {
      setBusy(false)
    }
  }

  function handleClaim() {
    if (!window.confirm('Assumir esta coleta? Ela deixará de aparecer para outras pessoas.')) return
    void run('claim')
  }

  function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void run('complete', {
      collectedQuantity: String(form.get('collectedQuantity') ?? ''),
      observation: String(form.get('observation') ?? ''),
      photoId: photo?.id ?? null,
    })
  }

  function handleGiveUp() {
    if (
      !window.confirm(
        'Desistir desta coleta? Ela volta para o mapa e outras pessoas poderão assumir.',
      )
    )
      return
    void run('give-up')
  }

  function handleRelease() {
    if (
      !window.confirm(
        `Liberar a coleta? ${collection?.collector.name} não poderá mais finalizá-la e a ocorrência volta para o mapa.`,
      )
    )
      return
    void run('release')
  }

  let content: ReactNode = null

  if (status === 'AVAILABLE') {
    if (isOwner) {
      content = <Note>Aguardando alguém assumir a coleta.</Note>
    } else if (user && !user.emailVerified) {
      content = (
        <VerifyEmailLink className={`${primaryButton} block text-center`}>
          Confirme seu e-mail para coletar
        </VerifyEmailLink>
      )
    } else if (user) {
      content = (
        <button type="button" onClick={handleClaim} disabled={busy} className={primaryButton}>
          {busy ? 'Assumindo…' : 'Tenho interesse em coletar'}
        </button>
      )
    } else {
      content = (
        <Link
          to="/entrar"
          state={{ from: location.pathname }}
          className={`${primaryButton} block text-center`}
        >
          Entrar para coletar
        </Link>
      )
    }
  }

  if (status === 'IN_COLLECTION' && collection) {
    const releasableAt = Date.parse(collection.acceptedAt) + RELEASE_AFTER_HOURS * 3_600_000
    content = (
      <div className="flex flex-col gap-4">
        <Note tone="amber">
          Coleta assumida por <strong>{collectorName}</strong> em{' '}
          {formatDateTime(collection.acceptedAt)}.
        </Note>
        {isOwner &&
          (releasableAt <= openedAt ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-brand-700">
                A coleta está parada há mais de {RELEASE_AFTER_HOURS} h. Se a pessoa não apareceu,
                você pode liberar para outras pessoas.
              </p>
              <button
                type="button"
                onClick={handleRelease}
                disabled={busy}
                className="rounded-xl border-2 border-brand-700 px-6 py-2.5 font-semibold hover:bg-brand-100 disabled:opacity-60"
              >
                {busy ? 'Liberando…' : 'Liberar para outras pessoas'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-brand-700">
              Se a pessoa não aparecer, você poderá liberar a coleta para outras pessoas a partir de{' '}
              {formatDateTime(new Date(releasableAt).toISOString())}.
            </p>
          ))}
        {isCollector && (
          <form onSubmit={handleComplete} className="flex flex-col gap-3" noValidate>
            <h3 className="font-semibold">Finalizar coleta</h3>
            <TextField
              label="Quantidade coletada"
              name="collectedQuantity"
              maxLength={50}
              defaultValue={occurrence.estimatedQuantity ?? ''}
            />
            <TextField label="Observação" name="observation" maxLength={500} />
            <PhotoField
              label="Foto da coleta"
              value={photo}
              onChange={setPhoto}
              onBusyChange={setPhotoUploading}
            />
            <button type="submit" disabled={busy || photoUploading} className={primaryButton}>
              {busy ? 'Confirmando…' : 'Confirmar coleta'}
            </button>
          </form>
        )}
        {isCollector && (
          <button
            type="button"
            onClick={handleGiveUp}
            disabled={busy}
            className="self-center rounded-lg px-3 py-1.5 text-sm font-semibold text-red-700 underline hover:bg-red-50 disabled:opacity-60"
          >
            Desistir da coleta
          </button>
        )}
      </div>
    )
  }

  if (status === 'COLLECTED' && collection?.completedAt) {
    content = (
      <Note tone="blue">
        Coletado por <strong>{collectorName}</strong> em {formatDateTime(collection.completedAt)}.
        {collection.collectedQuantity && <> Quantidade: {collection.collectedQuantity}.</>}
        {collection.observation && <span className="mt-1 block">“{collection.observation}”</span>}
        {collection.photoUrl && (
          <a
            href={collection.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block w-fit"
          >
            <img
              src={collection.photoUrl}
              alt="Foto do material coletado"
              className="max-h-48 rounded-lg object-cover ring-1 ring-blue-200"
            />
          </a>
        )}
      </Note>
    )
  }

  if (status === 'CANCELLED' && collection?.cancelledAt) {
    content = (
      <Note tone="stone">
        Ocorrência cancelada por quem a registrou durante a coleta de{' '}
        <strong>{collectorName}</strong>.
      </Note>
    )
  }

  if (!content && !error) return null

  return (
    <section aria-label="Coleta" className="flex flex-col gap-3 border-t border-brand-100 pt-4">
      {content}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}

const noteTones = {
  green: 'bg-green-50 text-green-900',
  amber: 'bg-amber-50 text-amber-900',
  blue: 'bg-blue-50 text-blue-900',
  stone: 'bg-stone-100 text-stone-800',
}

function Note({
  children,
  tone = 'green',
}: {
  children: ReactNode
  tone?: keyof typeof noteTones
}) {
  return <p className={`rounded-lg px-3 py-2 text-sm ${noteTones[tone]}`}>{children}</p>
}
