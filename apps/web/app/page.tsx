import MapWrapper from '@/components/map/MapWrapper'
import TripsPanel from '@/components/trips/TripsPanel'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function HomePage() {
  const supabase = await createServerSupabase()

  // RLS scopes both queries to the signed-in user automatically.
  const [{ data: trips }, { data: destinations }] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, start_date, end_date')
      .order('created_at', { ascending: false }),
    supabase
      .from('trip_destinations')
      .select('id, city_name, country_name, lat, lng, notes, position')
      .order('position'),
  ])

  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <MapWrapper destinations={destinations ?? []} />
      <TripsPanel trips={trips ?? []} />
    </div>
  )
}
