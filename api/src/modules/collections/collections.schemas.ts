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

// Posição atual do coletor: ?lat=-25.43&lng=-49.27
export const routeQuerySchema = z.object({
  lat: z.coerce.number<string>().min(-90).max(90),
  lng: z.coerce.number<string>().min(-180).max(180),
})
