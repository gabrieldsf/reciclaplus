// Verifica se o domínio de um e-mail existe e recebe mensagens (registro MX no DNS).
// Não prova que a caixa postal existe (isso exige enviar um código), mas barra erros de
// digitação e domínios inventados, como "fulano@gmial.con".
import { promises as dns } from 'node:dns'

type MxResolver = (domain: string) => Promise<{ exchange: string; priority: number }[]>

let resolveMx: MxResolver = (domain) => dns.resolveMx(domain)

// Permite trocar o DNS real por um falso nos testes
export function setMxResolver(resolver: MxResolver | null) {
  resolveMx = resolver ?? ((domain) => dns.resolveMx(domain))
  cache.clear()
}

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { accepts: boolean; at: number }>()

// Domínio não existe / não tem MX: recusar. Falha do próprio DNS: não bloquear o cadastro.
const DEFINITIVE_ERRORS = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN'])

export async function domainAcceptsEmail(domain: string) {
  if (process.env['EMAIL_DOMAIN_CHECK'] === 'off') return true

  const key = domain.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.accepts

  let accepts: boolean
  try {
    const records = await resolveMx(key)
    // "Null MX" (RFC 7505): o domínio declara que não recebe e-mail
    accepts = records.some((r) => r.exchange !== '' && r.exchange !== '.')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? ''
    if (!DEFINITIVE_ERRORS.has(code)) return true
    accepts = false
  }

  cache.set(key, { accepts, at: Date.now() })
  return accepts
}
