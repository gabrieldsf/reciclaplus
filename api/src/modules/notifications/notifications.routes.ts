import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middlewares/require-auth.js'
import * as notificationsService from './notifications.service.js'

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (req, res) => {
  res.json(await notificationsService.listNotifications(req.userId!))
})

// Consulta leve para o número no sininho
notificationsRouter.get('/unread-count', async (req, res) => {
  res.json({ count: await notificationsService.countUnread(req.userId!) })
})

const markAsReadSchema = z.object({ ids: z.array(z.uuid()).max(100).optional() })

notificationsRouter.post('/read', async (req, res) => {
  const { ids } = markAsReadSchema.parse(req.body ?? {})
  res.json({ unreadCount: await notificationsService.markAsRead(req.userId!, ids) })
})
