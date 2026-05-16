// ─── Domain types — aligned with the Supabase schema ──────────────────────────
// Columns are snake_case because these objects come straight from Supabase.

export type Trip = {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
}

export type Destination = {
  id: string
  city_name: string
  country_name: string
  lat: number
  lng: number
  notes: string | null
  position: number
}

// Forward-looking — used by the itinerary type/status feature.
export type ItineraryItemType = 'activity' | 'hotel' | 'flight' | 'note'
export type ActivityStatus = 'definite' | 'maybe' | 'interested'

export type ItineraryItem = {
  id: string
  day: number
  title: string
  time: string | null
  notes: string | null
  completed: boolean
  position: number
  type: ItineraryItemType
  status: ActivityStatus
}

// ─── External: Nominatim (OpenStreetMap) geocoding response ────────────────────

export type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    country?: string
  }
}
