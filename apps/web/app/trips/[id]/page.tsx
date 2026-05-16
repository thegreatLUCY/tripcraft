import { createServerSupabase } from '@/lib/supabase-server'
import TripDetailClient from '@/components/trips/TripDetailClient'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const [{ data: trip }, { data: destinations }, { data: items }] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, start_date, end_date')
      .eq('id', id)
      .single(),
    supabase
      .from('trip_destinations')
      .select('id, city_name, country_name, lat, lng, notes, position')
      .eq('trip_id', id)
      .order('position'),
    supabase
      .from('itinerary_items')
      .select('id, day, title, time, notes, completed, position')
      .eq('trip_id', id)
      .order('day')
      .order('position'),
  ])

  if (!trip) notFound()

  return (
    <TripDetailClient
      trip={trip}
      initialDestinations={destinations ?? []}
      initialItems={items ?? []}
    />
  )
}
