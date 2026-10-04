import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { User } from '../auth/AuthContext'
import { api } from '../lib/api'
import { AVATAR_PRESETS, presetUrl } from '../lib/avatars'
import { resizeToSquare } from '../lib/image'
import { UserAvatar } from './UserAvatar'

// Escolha da foto de perfil: avatares de reciclagem ou uma foto do aparelho
export function AvatarPicker() {
  const { user, updateUser } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  if (!user) return null

  async function save(request: () => Promise<{ user: User }>, message: string) {
    setError('')
    setSaved('')
    setBusy(true)
    try {
      const res = await request()
      updateUser(res.user)
      setSaved(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setBusy(false)
    }
  }

  function choosePreset(key: string) {
    void save(
      () => api<{ user: User }>('/me/avatar', { method: 'PUT', body: { preset: key } }),
      'Avatar atualizado!',
    )
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    await save(async () => {
      const image = await resizeToSquare(file)
      return api<{ user: User }>('/me/avatar/photo', { method: 'PUT', file: image })
    }, 'Foto atualizada!')
  }

  const currentPreset = AVATAR_PRESETS.find((p) => user.avatarUrl === presetUrl(p.key))?.key
  const hasPhoto = user.avatarUrl?.startsWith('/api/') ?? false

  return (
    <section aria-labelledby="avatar-title" className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size="lg" />
        <div className="flex flex-col gap-2">
          <h2 id="avatar-title" className="font-bold">
            Foto de perfil
          </h2>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="rounded-lg border-2 border-brand-700 px-3 py-1.5 text-sm font-semibold hover:bg-brand-100 disabled:opacity-60"
          >
            <span aria-hidden="true">📷 </span>
            {hasPhoto ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              onClick={() =>
                void save(
                  () => api<{ user: User }>('/me/avatar', { method: 'DELETE' }),
                  'Foto removida.',
                )
              }
              disabled={busy}
              className="text-left text-sm text-red-700 underline disabled:opacity-60"
            >
              Remover
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={(e) => void handleFile(e)}
            className="sr-only"
            tabIndex={-1}
            aria-label="Escolher foto do aparelho"
          />
        </div>
      </div>

      <fieldset className="mt-5" disabled={busy}>
        <legend className="mb-2 text-sm text-brand-700">Ou escolha um avatar</legend>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_PRESETS.map(({ key, label }) => {
            const selected = currentPreset === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => choosePreset(key)}
                aria-pressed={selected}
                aria-label={`Avatar ${label}`}
                title={label}
                className={`aspect-square overflow-hidden rounded-full transition hover:scale-105 disabled:opacity-60 ${selected ? 'ring-4 ring-brand-700 ring-offset-2' : 'ring-1 ring-brand-100'}`}
              >
                <img src={presetUrl(key)} alt="" className="size-full" />
              </button>
            )
          })}
        </div>
      </fieldset>

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {busy && <span className="text-brand-700">Salvando…</span>}
        {!busy && saved && <span className="text-green-800">{saved}</span>}
        {!busy && error && (
          <span role="alert" className="text-red-700">
            {error}
          </span>
        )}
      </p>
    </section>
  )
}
