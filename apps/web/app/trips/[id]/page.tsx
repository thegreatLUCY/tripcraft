import { createServerSupabase } from '@/lib/supabase-server'
import TripDetailClient from '@/components/trips/TripDetailClient'
import { loadTripDetail } from '@tripcraft/shared'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { trip, destinations, items } = await loadTripDetail(supabase, id)
  if (!trip) notFound()

  return (
    <TripDetailClient
      trip={trip}
      initialDestinations={destinations}
      initialItems={items}
    />
  )
}
