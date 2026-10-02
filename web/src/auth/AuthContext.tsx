import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError, tokenStorage } from '../lib/api'

export type UserType = 'PERSON' | 'COMPANY' | 'ADMIN'

export type User = {
  id: string
  name: string
  email: string
  userType: UserType
  createdAt: string
}

export type RegisterData = {
  name: string
  email: string
  password: string
  userType: 'PERSON' | 'COMPANY'
}

type AuthResponse = { user: User; token: string }

type AuthContextValue = {
  user: User | null
  // true enquanto a sessão salva ainda está sendo validada na API
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => tokenStorage.get() !== null)

  useEffect(() => {
    if (!tokenStorage.get()) return
    api<{ user: User }>('/auth/me')
      .then(({ user }) => setUser(user))
      .catch((err) => {
        // Só descarta o token se a API recusou; falha de rede mantém a sessão salva
        if (err instanceof ApiError && err.status === 401) tokenStorage.clear()
      })
      .finally(() => setLoading(false))
  }, [])

  const startSession = useCallback(({ user, token }: AuthResponse) => {
    tokenStorage.set(token)
    setUser(user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      startSession(
        await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
      )
    },
    [startSession],
  )

  const register = useCallback(
    async (data: RegisterData) => {
      startSession(await api<AuthResponse>('/auth/register', { method: 'POST', body: data }))
    },
    [startSession],
  )

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
