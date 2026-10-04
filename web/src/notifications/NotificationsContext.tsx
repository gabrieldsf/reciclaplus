import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'

// De quanto em quanto tempo o número do sininho é atualizado com o app aberto
const POLL_MS = 60_000

type NotificationsContextValue = {
  unreadCount: number
  setUnreadCount: (count: number) => void
  refresh: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

// Número de avisos não lidos do sininho. Atualiza ao trocar de tela, ao voltar para o
// app e a cada minuto (sem servidor de push: uma consulta leve basta para o MVP).
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const userId = user?.id

  const refresh = useCallback(() => {
    if (!userId) return
    api<{ count: number }>('/notifications/unread-count')
      .then((res) => setUnreadCount(res.count))
      .catch(() => {})
  }, [userId])

  // A cada tela nova, confere de novo
  useEffect(() => {
    refresh()
  }, [pathname, refresh])

  useEffect(() => {
    if (!userId) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [userId, refresh])

  // Sem login, não há avisos (mesmo que tenha sobrado um número da sessão anterior)
  const count = userId ? unreadCount : 0
  const value = useMemo(() => ({ unreadCount: count, setUnreadCount, refresh }), [count, refresh])
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de <NotificationsProvider>')
  return ctx
}
