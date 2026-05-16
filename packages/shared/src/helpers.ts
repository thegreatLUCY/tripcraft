import type { Trip, ItineraryItem, NominatimResult } from './types'

// Best-effort city name from a Nominatim result.
export function extractCity(r: NominatimResult): string {
  return (
    r.address.city ??
    r.address.town ??
    r.address.municipality ??
    r.address.village ??
    r.display_name.split(',')[0]
  )
}

// "Jun 2, 2025" — or null if no date.
export function formatDate(date: string | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// The list of day numbers to show. Driven by trip dates when set (capped at 30),
// otherwise derived from existing items plus one empty trailing day.
export function getDays(trip: Trip | null, items: ItineraryItem[]): number[] {
  if (trip?.start_date && trip?.end_date) {
    const start = new Date(trip.start_date + 'T00:00')
    const end = new Date(trip.end_date + 'T00:00')
    const count = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
    return Array.from({ length: Math.min(count, 30) }, (_, i) => i + 1)
  }
  const existing = [...new Set(items.map(i => i.day))].sort((a, b) => a - b)
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return [...existing, next]
}

// "Mon, Jun 2" when the trip has a start date, otherwise "Day 3".
export function getDayLabel(trip: Trip | null, day: number): string {
  if (!trip?.start_date) return `Day ${day}`
  const date = new Date(trip.start_date + 'T00:00')
  date.setDate(date.getDate() + day - 1)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
