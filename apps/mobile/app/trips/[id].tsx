import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import MapView, { Marker, UrlTile } from 'react-native-maps'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'

type Destination = {
  id: string
  city_name: string
  country_name: string
  lat: number
  lng: number
}

type Trip = {
  id: string
  title: string
  start_date: string | null
  end_date: string | null
}

type ItineraryItem = {
  id: string
  day: number
  title: string
  time: string | null
}

type NominatimResult = {
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

function extractCity(r: NominatimResult) {
  return r.address.city ?? r.address.town ?? r.address.municipality ?? r.address.village ?? r.display_name.split(',')[0]
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDays(trip: Trip | null, items: ItineraryItem[]): number[] {
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

function getDayLabel(trip: Trip | null, day: number): string {
  if (!trip?.start_date) return `Day ${day}`
  const date = new Date(trip.start_date + 'T00:00')
  date.setDate(date.getDate() + day - 1)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapView>(null)

  const [tab, setTab] = useState<'destinations' | 'itinerary'>('destinations')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [markersReady, setMarkersReady] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [deletingDest, setDeletingDest] = useState<string | null>(null)

  const [items, setItems] = useState<ItineraryItem[]>([])
  const [addingToDay, setAddingToDay] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [savingItem, setSavingItem] = useState(false)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)

  // Load trip, destinations, and itinerary items
  useEffect(() => {
    Promise.all([
      supabase.from('trips').select('id, title, start_date, end_date').eq('id', id).single(),
      supabase.from('trip_destinations').select('id, city_name, country_name, lat, lng').eq('trip_id', id).order('created_at'),
      supabase.from('itinerary_items').select('id, day, title, time').eq('trip_id', id).order('day').order('created_at'),
    ]).then(([{ data: t }, { data: d }, { data: it }]) => {
      setTrip(t)
      setDestinations(d ?? [])
      setItems(it ?? [])
    })
  }, [id])

  useEffect(() => {
    if (!mapReady || destinations.length === 0) return
    if (destinations.length === 1) {
      mapRef.current?.animateToRegion({ latitude: destinations[0].lat, longitude: destinations[0].lng, latitudeDelta: 5, longitudeDelta: 5 })
      return
    }
    mapRef.current?.fitToCoordinates(
      destinations.map(d => ({ latitude: d.lat, longitude: d.lng })),
      { edgePadding: { top: 160, right: 50, bottom: 360, left: 50 }, animated: true }
    )
  }, [destinations, mapReady])

  useEffect(() => {
    if (destinations.length === 0) return
    setMarkersReady(false)
    const t = setTimeout(() => setMarkersReady(true), 500)
    return () => clearTimeout(t)
  }, [destinations])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        setResults(await res.json())
      } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  async function handleAdd(result: NominatimResult) {
    setAdding(result.place_id)
    const cityName = extractCity(result)
    const countryName = result.address.country ?? ''
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const { data, error } = await supabase
      .from('trip_destinations')
      .insert({ trip_id: id, city_name: cityName, country_name: countryName, lat, lng })
      .select('id, city_name, country_name, lat, lng').single()
    if (!error) {
      setDestinations(prev => [...prev, data ?? { id: `local-${Date.now()}`, city_name: cityName, country_name: countryName, lat, lng }])
      setResults([])
      setQuery('')
    }
    setAdding(null)
  }

  async function handleDeleteDest(destId: string) {
    setDeletingDest(destId)
    const { error } = await supabase.from('trip_destinations').delete().eq('id', destId)
    if (!error) setDestinations(prev => prev.filter(d => d.id !== destId))
    setDeletingDest(null)
  }

  async function handleAddItem(day: number) {
    if (!newTitle.trim()) return
    setSavingItem(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({ trip_id: id, day, title: newTitle.trim(), time: newTime || null, user_id: user!.id })
      .select('id, day, title, time').single()
    if (!error) {
      setItems(prev => [...prev, data ?? { id: `local-${Date.now()}`, day, title: newTitle.trim(), time: newTime || null }])
      setNewTitle('')
      setNewTime('')
      setAddingToDay(null)
    }
    setSavingItem(false)
  }

  async function handleDeleteItem(itemId: string) {
    setDeletingItem(itemId)
    const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId)
    if (!error) setItems(prev => prev.filter(i => i.id !== itemId))
    setDeletingItem(null)
  }

  function handleDeleteTrip() {
    Alert.alert('Delete Trip', 'This will permanently delete this trip and all its destinations.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('trips').delete().eq('id', id); router.replace('/') } },
    ])
  }

  const days = getDays(trip, items)

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="none"
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }}
        rotateEnabled={false}
        onMapReady={() => setMapReady(true)}
      >
        <UrlTile urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
        {destinations.map((dest, i) => (
          <Marker key={dest.id} coordinate={{ latitude: dest.lat, longitude: dest.lng }} tracksViewChanges={!markersReady}>
            <View collapsable={false} style={styles.pin}>
              <Text style={styles.pinText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top card */}
      <View
        className="absolute left-4 right-4 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/90"
        style={{ top: insets.top + 16 }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text className="text-xs text-neutral-400">← All trips</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteTrip}>
            <Text className="text-xs text-neutral-400">🗑 Delete</Text>
          </TouchableOpacity>
        </View>
        {trip ? (
          <>
            <Text className="text-lg font-bold text-neutral-900 dark:text-white">{trip.title}</Text>
            {(trip.start_date || trip.end_date) && (
              <Text className="mt-0.5 text-xs text-neutral-400">
                {formatDate(trip.start_date)}{trip.start_date && trip.end_date ? ' → ' : ''}{formatDate(trip.end_date)}
              </Text>
            )}
          </>
        ) : <ActivityIndicator size="small" color="#0d9488" />}
      </View>

      {/* Bottom card */}
      <View
        className="absolute left-4 right-4 rounded-2xl border border-neutral-200 bg-white/90 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/90"
        style={{ bottom: insets.bottom + 16 }}
      >
        {/* Tab toggle */}
        <View className="flex-row gap-1 p-2">
          {(['destinations', 'itinerary'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 items-center rounded-lg py-1.5 ${tab === t ? 'bg-teal-500' : ''}`}
            >
              <Text className={`text-xs font-medium ${tab === t ? 'text-white' : 'text-neutral-400'}`}>
                {t === 'destinations' ? 'Destinations' : 'Itinerary'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-4 pb-4">
          {/* ── Destinations tab ── */}
          {tab === 'destinations' && (
            <>
              {destinations.length > 0 && (
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false} className="mb-3">
                  <View className="gap-1.5">
                    {destinations.map((dest, i) => (
                      <View key={dest.id} className="flex-row items-center gap-2">
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-teal-500">
                          <Text className="text-[11px] font-bold text-white">{i + 1}</Text>
                        </View>
                        <Text className="flex-1 text-sm font-medium text-neutral-900 dark:text-white">{dest.city_name}</Text>
                        <Text className="text-xs text-neutral-400">{dest.country_name}</Text>
                        <TouchableOpacity onPress={() => handleDeleteDest(dest.id)} disabled={deletingDest === dest.id}>
                          {deletingDest === dest.id ? <ActivityIndicator size="small" color="#9ca3af" /> : <Text className="text-xs text-neutral-300">✕</Text>}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              <Text className="mb-2 text-xs font-medium text-neutral-400">Add a destination</Text>
              <View className="flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                <TextInput
                  placeholder="Type a city name..."
                  placeholderTextColor="#a1a1aa"
                  value={query}
                  onChangeText={setQuery}
                  className="flex-1 text-sm text-neutral-900 dark:text-white"
                />
                {searching && <ActivityIndicator size="small" color="#0d9488" />}
              </View>
              {results.length > 0 && (
                <View className="mt-2 gap-0.5">
                  {results.map(r => (
                    <TouchableOpacity
                      key={r.place_id}
                      onPress={() => handleAdd(r)}
                      disabled={adding === r.place_id}
                      className="flex-row items-start gap-2 rounded-lg px-2 py-2"
                      style={{ opacity: adding === r.place_id ? 0.5 : 1 }}
                    >
                      <Text className="mt-0.5 text-teal-500">📍</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-neutral-900 dark:text-white">{extractCity(r)}</Text>
                        <Text className="text-xs text-neutral-400" numberOfLines={1}>{r.display_name}</Text>
                      </View>
                      {adding === r.place_id && <ActivityIndicator size="small" color="#0d9488" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ── Itinerary tab ── */}
          {tab === 'itinerary' && (
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <View className="gap-3">
                {days.map(day => {
                  const dayItems = items
                    .filter(i => i.day === day)
                    .sort((a, b) => (!a.time ? 1 : !b.time ? -1 : a.time.localeCompare(b.time)))

                  return (
                    <View key={day}>
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <Text className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {getDayLabel(trip, day)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => { setAddingToDay(addingToDay === day ? null : day); setNewTitle(''); setNewTime('') }}
                          className="rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800"
                        >
                          <Text className="text-xs text-neutral-500 dark:text-neutral-400">+ Add</Text>
                        </TouchableOpacity>
                      </View>

                      {dayItems.map(item => (
                        <View key={item.id} className="mb-1 flex-row items-center gap-2">
                          {item.time && (
                            <Text className="w-10 text-right text-xs tabular-nums text-neutral-400">{item.time}</Text>
                          )}
                          <Text className={`flex-1 text-sm text-neutral-900 dark:text-white ${!item.time ? 'pl-12' : ''}`}>
                            {item.title}
                          </Text>
                          <TouchableOpacity onPress={() => handleDeleteItem(item.id)} disabled={deletingItem === item.id}>
                            {deletingItem === item.id ? <ActivityIndicator size="small" color="#9ca3af" /> : <Text className="text-xs text-neutral-300">✕</Text>}
                          </TouchableOpacity>
                        </View>
                      ))}

                      {dayItems.length === 0 && addingToDay !== day && (
                        <Text className="text-xs text-neutral-300">No activities yet</Text>
                      )}

                      {addingToDay === day && (
                        <View className="mt-1.5 gap-1.5 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800">
                          <TextInput
                            placeholder="Activity name..."
                            placeholderTextColor="#a1a1aa"
                            value={newTitle}
                            onChangeText={setNewTitle}
                            autoFocus
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                          />
                          <TextInput
                            placeholder="Time (optional, e.g. 09:00)"
                            placeholderTextColor="#a1a1aa"
                            value={newTime}
                            onChangeText={setNewTime}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                          />
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => handleAddItem(day)}
                              disabled={savingItem || !newTitle.trim()}
                              className="flex-1 items-center rounded-lg bg-teal-500 py-2"
                              style={{ opacity: savingItem || !newTitle.trim() ? 0.5 : 1 }}
                            >
                              {savingItem ? <ActivityIndicator size="small" color="white" /> : <Text className="text-xs font-semibold text-white">Save</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setAddingToDay(null)} className="items-center rounded-lg border border-neutral-200 px-4 py-2 dark:border-neutral-700">
                              <Text className="text-xs text-neutral-500">Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0d9488',
    borderWidth: 2.5, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3,
    elevation: 4,
  },
  pinText: { color: 'white', fontSize: 13, fontWeight: '700' },
})
