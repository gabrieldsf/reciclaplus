import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useCategories } from '../../hooks/useCategories'
import { ApiError } from '../../lib/api'
import type { LatLng, OccurrenceInput } from '../../lib/types'
import { LocationPicker } from '../map/LocationPicker'
import { TextField } from '../TextField'

export type OccurrenceFormValues = {
  categoryId: number | null
  subcategoryId: number | null
  estimatedQuantity: string
  description: string
  location: LatLng | null
}

type OccurrenceFormProps = {
  initialValues?: OccurrenceFormValues
  submitLabel: string
  submittingLabel: string
  onSubmit: (input: OccurrenceInput) => Promise<void>
}

const emptyValues: OccurrenceFormValues = {
  categoryId: null,
  subcategoryId: null,
  estimatedQuantity: '',
  description: '',
  location: null,
}

const selectClasses =
  'rounded-lg border border-brand-700/30 bg-white px-3 py-2.5 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-500/30 aria-invalid:border-red-600'

export function OccurrenceForm({
  initialValues = emptyValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: OccurrenceFormProps) {
  const id = useId()
  const { categories } = useCategories()
  const [values, setValues] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const subcategories = categories.find((c) => c.id === values.categoryId)?.subcategories ?? []

  function update(patch: Partial<OccurrenceFormValues>) {
    setValues((v) => ({ ...v, ...patch }))
    // Limpa o erro dos campos que acabaram de ser alterados
    setFieldErrors((errors) => {
      const next = { ...errors }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    // CT05 / CT06: categoria e localização são obrigatórias (o backend valida de novo)
    const errors: Record<string, string> = {}
    if (values.categoryId === null) errors['categoryId'] = 'Selecione uma categoria'
    if (values.location === null) errors['location'] = 'Informe a localização do material'
    setFieldErrors(errors)
    if (values.categoryId === null || values.location === null) return

    setSubmitting(true)
    try {
      await onSubmit({
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId,
        estimatedQuantity: values.estimatedQuantity,
        description: values.description,
        ...values.location,
      })
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length > 0) {
        setFieldErrors(
          Object.fromEntries(
            err.fieldErrors.map((e) => [
              e.field === 'latitude' || e.field === 'longitude' ? 'location' : e.field,
              e.message,
            ]),
          ),
        )
      } else {
        setError(err instanceof Error ? err.message : 'Erro inesperado')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-category`} className="text-sm font-medium">
          Categoria *
        </label>
        <select
          id={`${id}-category`}
          value={values.categoryId ?? ''}
          onChange={(e) =>
            update({
              categoryId: e.target.value ? Number(e.target.value) : null,
              subcategoryId: null,
            })
          }
          aria-invalid={fieldErrors['categoryId'] ? true : undefined}
          aria-describedby={fieldErrors['categoryId'] ? `${id}-category-error` : undefined}
          className={selectClasses}
        >
          <option value="">Selecione…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {fieldErrors['categoryId'] && (
          <p id={`${id}-category-error`} className="text-sm text-red-700">
            {fieldErrors['categoryId']}
          </p>
        )}
      </div>

      {subcategories.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-subcategory`} className="text-sm font-medium">
            Subcategoria
          </label>
          <select
            id={`${id}-subcategory`}
            value={values.subcategoryId ?? ''}
            onChange={(e) =>
              update({ subcategoryId: e.target.value ? Number(e.target.value) : null })
            }
            className={selectClasses}
          >
            <option value="">Não especificar</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <TextField
        label="Quantidade estimada"
        placeholder="Ex.: 20 kg, 3 sacos, 1 caixa"
        maxLength={50}
        value={values.estimatedQuantity}
        onChange={(e) => update({ estimatedQuantity: e.target.value })}
        error={fieldErrors['estimatedQuantity']}
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium" id={`${id}-location`}>
          Localização *
        </span>
        <div role="group" aria-labelledby={`${id}-location`}>
          <LocationPicker
            value={values.location}
            onChange={(location) => update({ location })}
            invalid={Boolean(fieldErrors['location'])}
          />
        </div>
        {fieldErrors['location'] && (
          <p className="text-sm text-red-700">{fieldErrors['location']}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          Observações
        </label>
        <textarea
          id={`${id}-description`}
          rows={3}
          maxLength={500}
          placeholder="Ex.: material limpo, deixado na calçada, retirar até sexta"
          value={values.description}
          onChange={(e) => update({ description: e.target.value })}
          className={selectClasses}
        />
        {fieldErrors['description'] && (
          <p className="text-sm text-red-700">{fieldErrors['description']}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-brand-700 px-6 py-3 font-semibold text-white uppercase hover:bg-brand-900 disabled:opacity-60"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}
