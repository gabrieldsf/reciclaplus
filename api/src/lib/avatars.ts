// Avatares prontos (arquivos em web/public/avatars/<chave>.svg)
export const AVATAR_PRESETS = [
  'garrafa',
  'lata',
  'caixa',
  'folha',
  'arvore',
  'planeta',
  'lixeira',
  'sacola',
] as const

export type AvatarPreset = (typeof AVATAR_PRESETS)[number]

// Campos do usuário necessários para montar a URL do avatar (sem os bytes da imagem)
export const avatarSelect = {
  avatarPreset: true,
  avatarImageType: true,
  avatarUpdatedAt: true,
} as const

type AvatarFields = {
  id: string
  avatarPreset: string | null
  avatarImageType: string | null
  avatarUpdatedAt: Date | null
}

export function avatarUrl({ id, avatarPreset, avatarImageType, avatarUpdatedAt }: AvatarFields) {
  if (avatarImageType && avatarUpdatedAt) {
    // A versão na URL troca a cada envio, então a imagem pode ficar em cache "para sempre"
    return `/api/users/${id}/avatar?v=${avatarUpdatedAt.getTime()}`
  }
  if (avatarPreset) return `/avatars/${avatarPreset}.svg`
  return null
}

// Troca os campos internos de avatar por `avatarUrl` na resposta da API
export function withAvatarUrl<T extends AvatarFields>(user: T) {
  const { avatarPreset: _p, avatarImageType: _t, avatarUpdatedAt: _u, ...rest } = user
  return { ...rest, avatarUrl: avatarUrl(user) }
}

// Confere a assinatura do arquivo (não confia só no Content-Type enviado)
export function detectImageType(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}
