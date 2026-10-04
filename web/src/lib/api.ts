// Cliente HTTP da API do Recicla+

const TOKEN_KEY = 'reciclaplus:token'

export type FieldError = { field: string; message: string }

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldError[]
  // Identificador estável vindo da API (ex.: EMAIL_NOT_VERIFIED)
  readonly code: string | undefined

  constructor(status: number, message: string, fieldErrors: FieldError[] = [], code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// `body` é enviado como JSON; `file` (ex.: foto) é enviado como está, com o próprio tipo
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; file?: Blob } = {},
) {
  const headers: Record<string, string> = {}
  const token = tokenStorage.get()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.file) headers['Content-Type'] = options.file.type || 'application/octet-stream'

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.file ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? 'Erro inesperado', data.errors ?? [], data.code)
  }
  return data as T
}
