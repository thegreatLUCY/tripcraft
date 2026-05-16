import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import MapView, { UrlTile } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

type Trip = {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('trips')
      .select('id, title, start_date, end_date')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTrips(data ?? [])
        setLoading(false)
      })
  }, [])

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        mapType="none"
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }}
        rotateEnabled={false}
        minZoomLevel={0}
        maxZoomLevel={18}
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
      </MapView>

      {/* Floating card */}
      <View
        className="absolute left-4 right-4 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/90"
        style={{ top: insets.top + 16 }}
      >
        {/* Header row */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-teal-500">
              <Text className="text-xs font-bold text-white">T</Text>
            </View>
            <Text className="text-sm font-semibold text-neutral-900 dark:text-white">My Trips</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Link href="/trips/new" asChild>
              <TouchableOpacity className="rounded-lg bg-teal-500 px-3 py-1.5">
                <Text className="text-xs font-semibold text-white">+ New Trip</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity onPress={handleLogout} className="px-1">
              <Text className="text-xs text-neutral-400">Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trips list */}
        {loading ? (
          <Text className="py-2 text-center text-sm text-neutral-400">Loading...</Text>
        ) : trips.length === 0 ? (
          <View className="py-2">
            <Text className="mb-1 text-base font-bold text-neutral-900 dark:text-white">
              Your trip. <Text className="text-teal-500">Your way.</Text>
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              Plan stress-free trips with a map-first interface.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <View className="gap-2">
              {trips.map(trip => (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => router.push(`/trips/${trip.id}`)}
                  className="rounded-xl border border-neutral-100 bg-white/80 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/80"
                >
                  <Text className="text-sm font-medium text-neutral-900 dark:text-white">
                    {trip.title}
                  </Text>
                  {(trip.start_date || trip.end_date) && (
                    <Text className="mt-0.5 text-xs text-neutral-400">
                      {formatDate(trip.start_date)}
                      {trip.start_date && trip.end_date ? ' → ' : ''}
                      {formatDate(trip.end_date)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
