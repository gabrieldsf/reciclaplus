// Formatos devolvidos pela API

export type Subcategory = { id: number; name: string }

export type Category = {
  id: number
  name: string
  description: string | null
  subcategories: Subcategory[]
}

export type OccurrenceStatus = 'AVAILABLE' | 'IN_COLLECTION' | 'COLLECTED' | 'CANCELLED'

type PublicUser = { id: string; name: string; userType: 'PERSON' | 'COMPANY' | 'ADMIN' }

export type Collection = {
  id: string
  acceptedAt: string
  completedAt: string | null
  cancelledAt: string | null
  collectedQuantity: string | null
  observation: string | null
  collector: PublicUser
}

export type Occurrence = {
  id: string
  description: string | null
  estimatedQuantity: string | null
  latitude: number
  longitude: number
  photoUrl: string | null
  status: OccurrenceStatus
  createdAt: string
  updatedAt: string
  category: { id: number; name: string }
  subcategory: { id: number; name: string } | null
  user: PublicUser
  // Coleta mais recente (em andamento, concluída ou cancelada), se houver
  collection: Collection | null
}

// Item de GET /api/me/collections: a coleta com um resumo da ocorrência
export type MyCollection = Omit<Collection, 'collector'> & {
  occurrence: Omit<Occurrence, 'collection'>
}

// GET /api/stats
export type CategoryStat = { id: number; name: string; total: number; collected: number }
export type WeekStat = { weekStart: string; registered: number; collected: number }
export type PlatformStats = {
  occurrences: Record<OccurrenceStatus, number> & { total: number }
  collectionRate: number | null
  averageHours: { untilClaimed: number | null; untilCollected: number | null }
  participants: { people: number; companies: number; collectors: number }
  byCategory: CategoryStat[]
  weekly: WeekStat[]
}

export type LatLng = { latitude: number; longitude: number }

export type OccurrenceInput = {
  categoryId: number
  subcategoryId: number | null
  estimatedQuantity: string
  description: string
} & LatLng
