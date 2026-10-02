import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .nullish()
    .transform((value) => value || null)

export const completeCollectionSchema = z.object({
  collectedQuantity: optionalText(50),
  observation: optionalText(500),
})

export type CompleteCollectionInput = z.infer<typeof completeCollectionSchema>
