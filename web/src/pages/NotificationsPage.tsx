import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { OccurrenceThumb } from '../components/occurrences/OccurrenceThumb'
import { StatusBadge } from '../components/occurrences/StatusBadge'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import type { AppNotification, NotificationType } from '../lib/types'
import { useNotifications } from '../notifications/NotificationsContext'

// Texto de cada aviso, do ponto de vista de quem o recebe
const messages: Record<NotificationType, { icon: string; text: (actor: string) => string }> = {
  COLLECTION_CLAIMED: { icon: '🚚', text: (a) => `${a} assumiu a coleta do seu material.` },
  COLLECTION_COMPLETED: { icon: '✅', text: (a) => `${a} coletou o seu material. Obrigado!` },
  COLLECTION_GAVE_UP: {
    icon: '↩️',
    text: (a) => `${a} desistiu da coleta. Sua ocorrência voltou para o mapa.`,
  },
  COLLECTION_RELEASED: {
    icon: '🔓',
    text: (a) => `${a} liberou para outras pessoas a coleta que estava com você.`,
  },
  OCCURRENCE_CANCELLED: {
    icon: '🚫',
    text: (a) => `${a} cancelou a ocorrência que você ia coletar.`,
  },
}

export function NotificationsPage() {
  const { setUnreadCount } = useNotifications()
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [error, setError] = useState('')

  // Ao abrir a tela, tudo conta como visto (os novos continuam destacados até sair)
  useEffect(() => {
    let active = true
    api<{ notifications: AppNotification[]; unreadCount: number }>('/notifications')
      .then(async (res) => {
        if (!active) return
        setNotifications(res.notifications)
        if (res.unreadCount > 0) {
          const read = await api<{ unreadCount: number }>('/notifications/read', {
            method: 'POST',
          })
          if (active) setUnreadCount(read.unreadCount)
        }
      })
      .catch((err: Error) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [setUnreadCount])

  return (
    <section className="mx-auto max-w-2xl p-4 md:p-8">
      <h1 className="mb-1 text-2xl font-bold">Notificações</h1>
      <p className="mb-4 text-brand-700">
        Atualizações das suas ocorrências e coletas. Toque para ver o histórico completo.
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error}
        </p>
      )}
      {!notifications && !error && <p className="text-brand-700">Carregando…</p>}

      {notifications?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
          <span aria-hidden="true" className="text-4xl">
            🔔
          </span>
          <p className="text-brand-700">
            Nenhuma notificação ainda. Quando alguém assumir ou coletar o seu material, você fica
            sabendo aqui.
          </p>
        </div>
      )}

      {notifications && notifications.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const { icon, text } = messages[n.type]
            const unread = n.readAt === null
            const { occurrence } = n
            return (
              <li key={n.id}>
                <Link
                  to={`/ocorrencias/${occurrence.id}`}
                  className={`flex items-start gap-3 rounded-2xl p-4 shadow-sm hover:ring-2 hover:ring-brand-500/30 ${unread ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white'}`}
                >
                  <OccurrenceThumb
                    categoryName={occurrence.category.name}
                    photoUrl={occurrence.photoUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span aria-hidden="true">{icon} </span>
                      {unread && <span className="sr-only">Nova: </span>}
                      <span className={unread ? 'font-semibold' : ''}>{text(n.actor.name)}</span>
                    </p>
                    <p className="mt-1 text-xs text-brand-700">
                      {occurrence.category.name}
                      {occurrence.subcategory && ` · ${occurrence.subcategory.name}`}
                      {occurrence.estimatedQuantity && ` · ${occurrence.estimatedQuantity}`}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <time dateTime={n.createdAt} className="text-xs text-brand-700">
                        {formatDateTime(n.createdAt)}
                      </time>
                      <StatusBadge status={occurrence.status} />
                    </div>
                  </div>
                  {unread && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2.5 shrink-0 rounded-full bg-amber-500"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
