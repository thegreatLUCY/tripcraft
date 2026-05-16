import MapWrapper from '@/components/map/MapWrapper'
import TripsPanel from '@/components/trips/TripsPanel'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function HomePage() {
  const supabase = await createServerSupabase()
  const { data: trips } = await supabase
    .from('trips')
    .select('id, title, start_date, end_date')
    .order('created_at', { ascending: false })

  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <MapWrapper />
      <TripsPanel trips={trips ?? []} />
    </div>
  )
}
