import { Router } from 'express'
import { AppError } from '../../lib/errors.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { completeCollectionSchema } from '../collections/collections.schemas.js'
import * as collectionsService from '../collections/collections.service.js'
import {
  createOccurrenceSchema,
  listOccurrencesQuerySchema,
  occurrenceIdSchema,
  updateOccurrenceSchema,
} from './occurrences.schemas.js'
import * as occurrencesService from './occurrences.service.js'

export const occurrencesRouter = Router()

// Um id em formato inválido é tratado como ocorrência inexistente
function parseId(id: string | string[] | undefined) {
  const result = occurrenceIdSchema.safeParse(id)
  if (!result.success) throw new AppError(404, 'Ocorrência não encontrada')
  return result.data
}

occurrencesRouter.get('/', async (req, res) => {
  const query = listOccurrencesQuerySchema.parse(req.query)
  res.json({ occurrences: await occurrencesService.listOccurrences(query) })
})

occurrencesRouter.get('/:id', async (req, res) => {
  res.json({ occurrence: await occurrencesService.getOccurrence(parseId(req.params.id)) })
})

occurrencesRouter.post('/', requireAuth, async (req, res) => {
  const input = createOccurrenceSchema.parse(req.body)
  const occurrence = await occurrencesService.createOccurrence(req.userId!, input)
  res.status(201).json({ occurrence })
})

occurrencesRouter.patch('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  const input = updateOccurrenceSchema.parse(req.body)
  res.json({ occurrence: await occurrencesService.updateOccurrence(id, req.userId!, input) })
})

occurrencesRouter.post('/:id/cancel', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  res.json({ occurrence: await occurrencesService.cancelOccurrence(id, req.userId!) })
})

// Coletas
occurrencesRouter.post('/:id/claim', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  res.json({ occurrence: await collectionsService.claimOccurrence(id, req.userId!) })
})

occurrencesRouter.post('/:id/complete', requireAuth, async (req, res) => {
  const id = parseId(req.params.id)
  const input = completeCollectionSchema.parse(req.body ?? {})
  res.json({
    occurrence: await collectionsService.completeCollection(id, req.userId!, input),
  })
})
