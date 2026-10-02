import jwt from 'jsonwebtoken'

const EXPIRES_IN = '7d'

export type TokenPayload = { sub: string }

function getSecret() {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return secret
}

export function signToken(userId: string) {
  return jwt.sign({}, getSecret(), { subject: userId, expiresIn: EXPIRES_IN })
}

// Lança erro se o token for inválido ou estiver expirado
export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getSecret())
  if (typeof payload === 'string' || !payload.sub) throw new Error('Token inválido')
  return { sub: payload.sub }
}
