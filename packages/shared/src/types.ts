// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  displayName: string
  avatarUrl?: string
  email: string
  createdAt: string
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export interface Trip {
  id: string
  ownerId: string
  title: string
  coverImageUrl?: string
  startDate?: string    // ISO date string: "2025-07-01"
  endDate?: string
  destinations: TripDestination[]
  createdAt: string
  updatedAt: string
}

export interface TripDestination {
  id: string
  tripId: string
  cityName: string
  countryName: string
  lat: number
  lng: number
  placeId?: string      // Google Places ID for rich data lookups
  orderIndex: number
}

// ─── Itinerary ────────────────────────────────────────────────────────────────

export type ItineraryItemType = 'hotel' | 'activity' | 'note' | 'flight'

export type ActivityStatus = 'definite' | 'maybe' | 'interested'

export interface ItineraryItem {
  id: string
  tripId: string
  dayNumber: number     // 1-indexed: Day 1, Day 2, etc.
  timeOfDay?: string    // "14:30" — optional, for ordering within a day
  type: ItineraryItemType
  title: string
  address?: string
  lat?: number
  lng?: number
  placeId?: string
  status: ActivityStatus
  notes?: string
  orderIndex: number
  createdAt: string
  updatedAt: string
}

// ─── Guest session ────────────────────────────────────────────────────────────

export interface GuestSession {
  sessionToken: string
  trip: Trip
  items: ItineraryItem[]
  createdAt: string
  expiresAt: string
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface AISuggestedActivity {
  title: string
  description: string
  category: string      // "museum" | "restaurant" | "outdoor" | etc.
  estimatedDuration?: string  // "2 hours"
  approximateAddress?: string
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number
  lng: number
}

export interface MapPin {
  id: string
  coordinates: Coordinates
  title: string
  type: ItineraryItemType
  status?: ActivityStatus
}
