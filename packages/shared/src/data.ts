import type { SupabaseClient } from '@supabase/supabase-js'
import type { Trip, Destination, ItineraryItem, ItineraryItemType, ActivityStatus } from './types'
import { MAX_DESTINATIONS, MAX_ITEMS_PER_DAY } from './constants'

// Uniform mutation result so callers can show a toast/alert consistently.
export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const DEST_COLS = 'id, city_name, country_name, lat, lng, notes, position'
const ITEM_COLS = 'id, day, title, time, notes, completed, position, type, status'

// ─── Loads ─────────────────────────────────────────────────────────────────────

export async function loadTripDetail(sb: SupabaseClient, tripId: string): Promise<{
  trip: Trip | null
  destinations: Destination[]
  items: ItineraryItem[]
}> {
  const [{ data: trip }, { data: destinations }, { data: items }] = await Promise.all([
    sb.from('trips').select('id, title, start_date, end_date').eq('id', tripId).single(),
    sb.from('trip_destinations').select(DEST_COLS).eq('trip_id', tripId).order('position'),
    sb.from('itinerary_items').select(ITEM_COLS).eq('trip_id', tripId).order('day').order('position'),
  ])
  return {
    trip: (trip as Trip) ?? null,
    destinations: (destinations as Destination[]) ?? [],
    items: (items as ItineraryItem[]) ?? [],
  }
}

// ─── Trip ──────────────────────────────────────────────────────────────────────

export async function updateTrip(
  sb: SupabaseClient,
  tripId: string,
  patch: { title: string; start_date: string | null; end_date: string | null },
): Promise<Result> {
  const { error } = await sb.from('trips').update(patch).eq('id', tripId)
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined }
}

export async function deleteTrip(sb: SupabaseClient, tripId: string): Promise<Result> {
  const { error } = await sb.from('trips').delete().eq('id', tripId)
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined }
}

// ─── Destinations ──────────────────────────────────────────────────────────────

export async function addDestination(
  sb: SupabaseClient,
  tripId: string,
  d: { city_name: string; country_name: string; lat: number; lng: number },
  currentCount: number,
): Promise<Result<Destination>> {
  if (currentCount >= MAX_DESTINATIONS) {
    return { ok: false, error: `You can add at most ${MAX_DESTINATIONS} destinations to a trip.` }
  }
  const { data, error } = await sb
    .from('trip_destinations')
    .insert({ trip_id: tripId, ...d, notes: null, position: currentCount + 1 })
    .select(DEST_COLS)
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'Insert failed' }
  return { ok: true, data: data as Destination }
}

// Returns ok:false when RLS silently blocks the delete (no error, 0 rows).
export async function deleteDestination(sb: SupabaseClient, id: string): Promise<Result> {
  const { data, error } = await sb.from('trip_destinations').delete().eq('id', id).select('id')
  if (error || !data || data.length === 0) return { ok: false, error: error?.message ?? 'Delete blocked' }
  return { ok: true, data: undefined }
}

export async function updateDestinationNote(
  sb: SupabaseClient,
  id: string,
  notes: string | null,
): Promise<Result> {
  const { error } = await sb.from('trip_destinations').update({ notes }).eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined }
}

// Persists a full new ordering (position = array index + 1).
export async function reorderDestinations(
  sb: SupabaseClient,
  orderedIds: string[],
): Promise<Result> {
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      sb.from('trip_destinations').update({ position: i + 1 }).eq('id', id).select('id'),
    ),
  )
  const failed = results.some(r => r.error || !r.data || r.data.length === 0)
  return failed ? { ok: false, error: 'Reorder failed' } : { ok: true, data: undefined }
}

// ─── Itinerary items ───────────────────────────────────────────────────────────

export async function addItem(
  sb: SupabaseClient,
  item: {
    trip_id: string
    day: number
    title: string
    time: string | null
    notes: string | null
    type: ItineraryItemType
    status: ActivityStatus
    user_id: string
  },
  dayCount: number,
): Promise<Result<ItineraryItem>> {
  if (dayCount >= MAX_ITEMS_PER_DAY) {
    return { ok: false, error: `You can add at most ${MAX_ITEMS_PER_DAY} activities per day.` }
  }
  const { data, error } = await sb
    .from('itinerary_items')
    .insert({ ...item, completed: false, position: dayCount + 1 })
    .select(ITEM_COLS)
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'Insert failed' }
  return { ok: true, data: data as ItineraryItem }
}

export async function deleteItem(sb: SupabaseClient, id: string): Promise<Result> {
  const { error } = await sb.from('itinerary_items').delete().eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined }
}

export async function setItemCompleted(
  sb: SupabaseClient,
  id: string,
  completed: boolean,
): Promise<Result> {
  const { error } = await sb.from('itinerary_items').update({ completed }).eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined }
}

export async function updateItem(
  sb: SupabaseClient,
  id: string,
  patch: {
    title: string
    time: string | null
    notes: string | null
    type: ItineraryItemType
    status: ActivityStatus
  },
): Promise<Result> {
  const { error } = await sb.from('itinerary_items').update(patch).eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined }
}

// Swaps the position of two items.
export async function swapItemPositions(
  sb: SupabaseClient,
  a: { id: string; position: number },
  b: { id: string; position: number },
): Promise<Result> {
  const results = await Promise.all([
    sb.from('itinerary_items').update({ position: b.position }).eq('id', a.id).select('id'),
    sb.from('itinerary_items').update({ position: a.position }).eq('id', b.id).select('id'),
  ])
  const failed = results.some(r => r.error || !r.data || r.data.length === 0)
  return failed ? { ok: false, error: 'Reorder failed' } : { ok: true, data: undefined }
}
