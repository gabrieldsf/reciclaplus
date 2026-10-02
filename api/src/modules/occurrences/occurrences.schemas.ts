import { z } from 'zod'
import { OccurrenceStatus } from '../../generated/prisma/enums.js'

// Texto opcional: string vazia vira null (limpa o campo)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .nullish()
    .transform((value) => value || null)

const occurrenceFields = {
  categoryId: z.number({ error: 'Categoria é obrigatória' }).int().positive(),
  subcategoryId: z.number().int().positive().nullish(),
  description: optionalText(500),
  estimatedQuantity: optionalText(50),
  latitude: z.number({ error: 'Localização é obrigatória' }).min(-90).max(90),
  longitude: z.number({ error: 'Localização é obrigatória' }).min(-180).max(180),
}

// RN02: categoria e localização são obrigatórias
export const createOccurrenceSchema = z.object(occurrenceFields)

export const updateOccurrenceSchema = z
  .object(occurrenceFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para alterar')

// ?categoryId=1,2&status=AVAILABLE,IN_COLLECTION
const commaList = z.string().transform((value) => value.split(',').filter(Boolean))

export const listOccurrencesQuerySchema = z.object({
  categoryId: commaList.pipe(z.array(z.coerce.number<string>().int().positive())).optional(),
  // Por padrão o mapa mostra apenas o que ainda pode ser coletado
  status: commaList.pipe(z.array(z.enum(OccurrenceStatus))).default([OccurrenceStatus.AVAILABLE]),
})

export const occurrenceIdSchema = z.uuid()

export type CreateOccurrenceInput = z.infer<typeof createOccurrenceSchema>
export type UpdateOccurrenceInput = z.infer<typeof updateOccurrenceSchema>
export type ListOccurrencesQuery = z.infer<typeof listOccurrencesQuerySchema>
