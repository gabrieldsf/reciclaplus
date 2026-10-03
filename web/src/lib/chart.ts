// Utilitários dos gráficos do painel

// Topo "redondo" para o eixo (2, 4, 6 ou 10 × 10ⁿ), nunca menor que `min`.
// Sempre par, para a linha do meio (topo ÷ 2) ser um número inteiro de ocorrências.
export function niceMax(value: number, min = 4) {
  const target = Math.max(value, min)
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const step of [2, 4, 6, 10]) {
      if (step * magnitude >= target) return step * magnitude
    }
  }
}

export function formatHours(hours: number | null) {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${Math.round(hours).toLocaleString('pt-BR')} h`
  return `${Math.round(hours / 24).toLocaleString('pt-BR')} dias`
}

export function formatPercent(ratio: number | null) {
  if (ratio === null) return '—'
  return `${Math.round(ratio * 100)}%`
}

// "2026-09-28" → "28/09"
export function formatWeek(isoDate: string) {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

// plural(1, 'empresa', 'empresas') → "1 empresa"
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
