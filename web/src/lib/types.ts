// Formatos devolvidos pela API

export type Subcategory = { id: number; name: string }

export type Category = {
  id: number
  name: string
  description: string | null
  subcategories: Subcategory[]
}

export type OccurrenceStatus = 'AVAILABLE' | 'IN_COLLECTION' | 'COLLECTED' | 'CANCELLED'

type PublicUser = {
  id: string
  name: string
  userType: 'PERSON' | 'COMPANY' | 'ADMIN'
  avatarUrl: string | null
}

export type Collection = {
  id: string
  acceptedAt: string
  completedAt: string | null
  cancelledAt: string | null
  collectedQuantity: string | null
  observation: string | null
  // Foto do material coletado (opcional)
  photoUrl: string | null
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
  // Coleta atual (em andamento, concluída ou cancelada), se houver
  collection: Collection | null
  // Coletas desfeitas antes (o coletor desistiu ou o dono liberou)
  releasedCollections: ReleasedCollection[]
}

// GAVE_UP: o coletor desistiu · RELEASED_BY_OWNER: o dono liberou a coleta parada
export type ReleaseReason = 'GAVE_UP' | 'RELEASED_BY_OWNER'

export type ReleasedCollection = {
  id: string
  acceptedAt: string
  releasedAt: string
  releaseReason: ReleaseReason
  collector: PublicUser
}

// Resumo da ocorrência usado no histórico (sem as coletas)
export type OccurrenceSummary = Omit<Occurrence, 'collection' | 'releasedCollections'>

// Item de GET /api/me/collections: a coleta com um resumo da ocorrência
export type MyCollection = Omit<Collection, 'collector'> & {
  releasedAt: string | null
  releaseReason: ReleaseReason | null
  occurrence: OccurrenceSummary
}

// GET /api/notifications
export type NotificationType =
  | 'COLLECTION_CLAIMED'
  | 'COLLECTION_COMPLETED'
  | 'COLLECTION_GAVE_UP'
  | 'COLLECTION_RELEASED'
  | 'OCCURRENCE_CANCELLED'

export type AppNotification = {
  id: string
  type: NotificationType
  createdAt: string
  readAt: string | null
  actor: { id: string; name: string; avatarUrl: string | null }
  occurrence: {
    id: string
    status: OccurrenceStatus
    estimatedQuantity: string | null
    photoUrl: string | null
    category: { id: number; name: string }
    subcategory: { id: number; name: string } | null
  }
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
  photoId: string | null
} & LatLng

// Foto já enviada (POST /api/photos)
export type UploadedPhoto = { id: string; url: string }
