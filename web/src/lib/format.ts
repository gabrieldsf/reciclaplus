import type { OccurrenceStatus } from './types'

export const statusLabels: Record<OccurrenceStatus, string> = {
  AVAILABLE: 'Disponível',
  IN_COLLECTION: 'Em coleta',
  COLLECTED: 'Coletado',
  CANCELLED: 'Cancelado',
}

export const statusBadgeClasses: Record<OccurrenceStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  IN_COLLECTION: 'bg-amber-100 text-amber-800',
  COLLECTED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-stone-200 text-stone-700',
}

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso))
}
