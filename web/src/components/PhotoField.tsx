import { useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { api } from '../lib/api'
import { resizeToFit } from '../lib/image'
import type { UploadedPhoto } from '../lib/types'

type PhotoFieldProps = {
  label: string
  value: UploadedPhoto | null
  onChange: (photo: UploadedPhoto | null) => void
  // Avisa o formulário enquanto a foto sobe (para não enviar antes de terminar)
  onBusyChange?: (busy: boolean) => void
}

// Foto opcional: abre a câmera ou a galeria, reduz no próprio celular e já envia,
// mostrando a prévia. O formulário só guarda o id da foto enviada.
export function PhotoField({ label, value, onChange, onBusyChange }: PhotoFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    setError('')
    setUploading(true)
    onBusyChange?.(true)
    try {
      const image = await resizeToFit(file)
      const res = await api<{ photo: UploadedPhoto }>('/photos', { method: 'POST', file: image })
      onChange(res.photo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a foto')
    } finally {
      setUploading(false)
      onBusyChange?.(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium" id={`${id}-label`}>
        {label} <span className="font-normal text-brand-700">(opcional)</span>
      </span>

      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value.url}
            alt="Prévia da foto"
            className="size-24 rounded-lg object-cover ring-1 ring-brand-100"
          />
          <div className="flex flex-col items-start gap-1 text-sm">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={uploading}
              className="font-semibold text-brand-700 underline disabled:opacity-60"
            >
              Trocar foto
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="text-red-700 underline disabled:opacity-60"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          aria-describedby={`${id}-hint`}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-700/40 bg-white px-3 py-4 font-medium hover:bg-brand-50 disabled:opacity-60"
        >
          <span aria-hidden="true">📷</span>
          {uploading ? 'Enviando foto…' : 'Adicionar foto'}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFile(e)}
        className="sr-only"
        tabIndex={-1}
        aria-labelledby={`${id}-label`}
      />
      <p id={`${id}-hint`} className="text-xs text-brand-700">
        Evite fotografar pessoas e placas de carro.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
