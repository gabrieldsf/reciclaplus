// Avatares prontos (public/avatars/<chave>.svg); a lista válida também existe na API
export const AVATAR_PRESETS = [
  { key: 'garrafa', label: 'Garrafa' },
  { key: 'lata', label: 'Lata' },
  { key: 'caixa', label: 'Caixa' },
  { key: 'folha', label: 'Folha' },
  { key: 'arvore', label: 'Árvore' },
  { key: 'planeta', label: 'Planeta' },
  { key: 'lixeira', label: 'Lixeira' },
  { key: 'sacola', label: 'Sacola' },
] as const

export const presetUrl = (key: string) => `/avatars/${key}.svg`
