import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// On React Native there is no .env.local — the anon key is public by design
export const supabase = createClient(
  'https://dgysazbykstamlmyevrz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRneXNhemJ5a3N0YW1sbXlldnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODkxMzEsImV4cCI6MjA5NDQ2NTEzMX0.323fYyD4MLDPWH5AwCgJUC58-CrsSNL-SbzvDzAbbTE',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
