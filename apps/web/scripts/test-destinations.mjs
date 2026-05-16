// Run with: node apps/web/scripts/test-destinations.mjs
// Tests that the anon role can INSERT and SELECT from trip_destinations

import { createClient } from '@supabase/supabase-js'

const url = 'https://dgysazbykstamlmyevrz.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRneXNhemJ5a3N0YW1sbXlldnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODkxMzEsImV4cCI6MjA5NDQ2NTEzMX0.323fYyD4MLDPWH5AwCgJUC58-CrsSNL-SbzvDzAbbTE'

const supabase = createClient(url, key)

async function run() {
  // 1. Find a real trip to use as the foreign key
  const { data: trips, error: tripErr } = await supabase
    .from('trips')
    .select('id, title')
    .limit(1)
    .single()

  if (tripErr || !trips) {
    console.error('❌ Could not fetch a trip:', tripErr?.message ?? 'no trips found')
    process.exit(1)
  }

  console.log(`Using trip: "${trips.title}" (${trips.id})`)

  // 2. INSERT a test destination
  const { data: inserted, error: insertErr } = await supabase
    .from('trip_destinations')
    .insert({
      trip_id: trips.id,
      city_name: '__test_city__',
      country_name: '__test_country__',
      lat: 0,
      lng: 0,
    })
    .select('id, city_name, country_name, lat, lng')
    .single()

  if (insertErr) {
    console.error('❌ INSERT failed:', insertErr.message)
    process.exit(1)
  }

  if (!inserted) {
    console.error('❌ INSERT succeeded but SELECT returned null — permission not granted yet')
    process.exit(1)
  }

  console.log('✅ INSERT + SELECT works:', inserted)

  // 3. Clean up the test row
  const { error: deleteErr } = await supabase
    .from('trip_destinations')
    .delete()
    .eq('id', inserted.id)

  if (deleteErr) {
    console.warn('⚠️  Cleanup failed (row left in DB):', deleteErr.message)
  } else {
    console.log('✅ Test row cleaned up — all good!')
  }
}

run()
