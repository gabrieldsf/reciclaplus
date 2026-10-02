// Formatos devolvidos pela API

export type Subcategory = { id: number; name: string }

export type Category = {
  id: number
  name: string
  description: string | null
  subcategories: Subcategory[]
}

export type OccurrenceStatus = 'AVAILABLE' | 'IN_COLLECTION' | 'COLLECTED' | 'CANCELLED'

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
  user: { id: string; name: string; userType: 'PERSON' | 'COMPANY' | 'ADMIN' }
}

export type LatLng = { latitude: number; longitude: number }

export type OccurrenceInput = {
  categoryId: number
  subcategoryId: number | null
  estimatedQuantity: string
  description: string
} & LatLng
