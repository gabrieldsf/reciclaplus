import type { NotificationType } from '../../generated/prisma/enums.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { avatarSelect, withAvatarUrl } from '../../lib/avatars.js'
import { prisma } from '../../lib/prisma.js'
import { photoUrl } from '../photos/photos.service.js'

// Quantos avisos a lista devolve (os mais recentes)
export const MAX_NOTIFICATIONS = 50

type NewNotification = {
  userId: string
  type: NotificationType
  occurrenceId: string
  actorId: string
}

// Cria o aviso dentro da mesma transação da mudança que o causou: ou os dois
// acontecem, ou nenhum
export function notify(tx: Prisma.TransactionClient, data: NewNotification) {
  return tx.notification.create({ data })
}

const notificationSelect = {
  id: true,
  type: true,
  createdAt: true,
  readAt: true,
  actor: { select: { id: true, name: true, ...avatarSelect } },
  occurrence: {
    select: {
      id: true,
      status: true,
      estimatedQuantity: true,
      photoId: true,
      category: { select: { id: true, name: true } },
      subcategory: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.NotificationSelect

export async function listNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_NOTIFICATIONS,
      select: notificationSelect,
    }),
    countUnread(userId),
  ])
  return {
    notifications: notifications.map(({ actor, occurrence: { photoId, ...occurrence }, ...n }) => ({
      ...n,
      actor: withAvatarUrl(actor),
      occurrence: { ...occurrence, photoUrl: photoUrl(photoId) },
    })),
    unreadCount,
  }
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

// Marca como lidos os avisos informados (ou todos, sem `ids`)
export async function markAsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids && { id: { in: ids } }) },
    data: { readAt: new Date() },
  })
  return countUnread(userId)
}
