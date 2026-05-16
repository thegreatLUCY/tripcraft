import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import MapView, { Marker, UrlTile } from 'react-native-maps'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import {
  type Destination, type Trip, type ItineraryItem, type NominatimResult,
  extractCity, formatDate, getDays, getDayLabel,
} from '@tripcraft/shared'

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

  // ── Edit trip ────────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Destinations ─────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [deletingDest, setDeletingDest] = useState<string | null>(null)
  const [editingDestNoteId, setEditingDestNoteId] = useState<string | null>(null)
  const [destNoteValue, setDestNoteValue] = useState('')
  const [savingDestNote, setSavingDestNote] = useState(false)

  // ── Itinerary ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [addingToDay, setAddingToDay] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [savingItem, setSavingItem] = useState(false)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemTitle, setEditItemTitle] = useState('')
  const [editItemTime, setEditItemTime] = useState('')
  const [editItemNotes, setEditItemNotes] = useState('')
  const [savingEditItem, setSavingEditItem] = useState(false)

  const sortedDests = [...destinations].sort((a, b) => a.position - b.position)
  const days = getDays(trip, items)

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('trips').select('id, title, start_date, end_date').eq('id', id).single(),
      supabase.from('trip_destinations').select('id, city_name, country_name, lat, lng, notes, position').eq('trip_id', id).order('position'),
      supabase.from('itinerary_items').select('id, day, title, time, notes, completed, position').eq('trip_id', id).order('day').order('position'),
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

  // ── Trip handlers ─────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editTitle.trim()) return
    if (editStartDate && editEndDate && editEndDate < editStartDate) {
      Alert.alert('Invalid dates', 'End date cannot be before start date')
      return
    }
    setSavingEdit(true)
    const { error } = await supabase
      .from('trips')
      .update({ title: editTitle.trim(), start_date: editStartDate || null, end_date: editEndDate || null })
      .eq('id', id)
    if (!error) {
      setTrip(prev => prev ? { ...prev, title: editTitle.trim(), start_date: editStartDate || null, end_date: editEndDate || null } : prev)
      setEditing(false)
    }
    setSavingEdit(false)
  }

  function handleDeleteTrip() {
    Alert.alert('Delete Trip', 'This will permanently delete this trip and all its data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('trips').delete().eq('id', id); router.replace('/') } },
    ])
  }

  // ── Destination handlers ──────────────────────────────────────────────────────
  function handleZoomTo(dest: Destination) {
    mapRef.current?.animateToRegion({ latitude: dest.lat, longitude: dest.lng, latitudeDelta: 2, longitudeDelta: 2 }, 800)
  }

  async function handleAdd(result: NominatimResult) {
    setAdding(result.place_id)
    const cityName = extractCity(result)
    const countryName = result.address.country ?? ''
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const { data, error } = await supabase
      .from('trip_destinations')
      .insert({ trip_id: id, city_name: cityName, country_name: countryName, lat, lng, notes: null, position: destinations.length + 1 })
      .select('id, city_name, country_name, lat, lng, notes, position').single()
    if (!error && data) {
      setDestinations(prev => [...prev, data])
      setResults([])
      setQuery('')
    }
    setAdding(null)
  }

  async function handleDeleteDest(destId: string) {
    setDeletingDest(destId)
    const { data, error } = await supabase.from('trip_destinations').delete().eq('id', destId).select('id')
    if (!error && data && data.length > 0) setDestinations(prev => prev.filter(d => d.id !== destId))
    setDeletingDest(null)
  }

  async function handleSaveDestNote(destId: string) {
    setSavingDestNote(true)
    const { error } = await supabase.from('trip_destinations').update({ notes: destNoteValue.trim() || null }).eq('id', destId)
    if (!error) {
      setDestinations(prev => prev.map(d => d.id === destId ? { ...d, notes: destNoteValue.trim() || null } : d))
      setEditingDestNoteId(null)
    }
    setSavingDestNote(false)
  }

  async function handleReorderDest(destId: string, dir: 'up' | 'down') {
    const idx = sortedDests.findIndex(d => d.id === destId)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedDests.length) return
    const a = sortedDests[idx]
    const b = sortedDests[swapIdx]
    const previous = destinations
    setDestinations(prev => prev.map(d => {  // optimistic
      if (d.id === a.id) return { ...d, position: b.position }
      if (d.id === b.id) return { ...d, position: a.position }
      return d
    }))
    const results = await Promise.all([
      supabase.from('trip_destinations').update({ position: b.position }).eq('id', a.id).select('id'),
      supabase.from('trip_destinations').update({ position: a.position }).eq('id', b.id).select('id'),
    ])
    const failed = results.some(r => r.error || !r.data || r.data.length === 0)
    if (failed) setDestinations(previous) // roll back so UI matches the DB
  }

  // ── Itinerary handlers ────────────────────────────────────────────────────────
  async function handleAddItem(day: number) {
    if (!newTitle.trim()) return
    setSavingItem(true)
    const { data: { user } } = await supabase.auth.getUser()
    const dayItems = items.filter(i => i.day === day)
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({ trip_id: id, day, title: newTitle.trim(), time: newTime || null, notes: newNotes.trim() || null, completed: false, position: dayItems.length + 1, user_id: user!.id })
      .select('id, day, title, time, notes, completed, position').single()
    if (!error && data) {
      setItems(prev => [...prev, data])
      setNewTitle(''); setNewTime(''); setNewNotes(''); setAddingToDay(null)
    }
    setSavingItem(false)
  }

  async function handleDeleteItem(itemId: string) {
    setDeletingItem(itemId)
    const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId)
    if (!error) setItems(prev => prev.filter(i => i.id !== itemId))
    setDeletingItem(null)
  }

  async function handleToggleDone(itemId: string, completed: boolean) {
    const { error } = await supabase.from('itinerary_items').update({ completed: !completed }).eq('id', itemId)
    if (!error) setItems(prev => prev.map(i => i.id === itemId ? { ...i, completed: !completed } : i))
  }

  async function handleSaveEditItem() {
    if (!editItemTitle.trim() || !editingItemId) return
    setSavingEditItem(true)
    const { error } = await supabase
      .from('itinerary_items')
      .update({ title: editItemTitle.trim(), time: editItemTime || null, notes: editItemNotes.trim() || null })
      .eq('id', editingItemId)
    if (!error) {
      setItems(prev => prev.map(i => i.id === editingItemId
        ? { ...i, title: editItemTitle.trim(), time: editItemTime || null, notes: editItemNotes.trim() || null }
        : i
      ))
      setEditingItemId(null)
    }
    setSavingEditItem(false)
  }

  async function handleReorderItem(itemId: string, day: number, dir: 'up' | 'down') {
    const dayItems = items.filter(i => i.day === day).sort((a, b) => a.position - b.position)
    const idx = dayItems.findIndex(i => i.id === itemId)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= dayItems.length) return
    const a = dayItems[idx]
    const b = dayItems[swapIdx]
    const previous = items
    setItems(prev => prev.map(i => {        // optimistic
      if (i.id === a.id) return { ...i, position: b.position }
      if (i.id === b.id) return { ...i, position: a.position }
      return i
    }))
    const results = await Promise.all([
      supabase.from('itinerary_items').update({ position: b.position }).eq('id', a.id).select('id'),
      supabase.from('itinerary_items').update({ position: a.position }).eq('id', b.id).select('id'),
    ])
    const failed = results.some(r => r.error || !r.data || r.data.length === 0)
    if (failed) setItems(previous) // roll back so UI matches the DB
  }

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
        {sortedDests.map((dest, i) => (
          <Marker key={dest.id} coordinate={{ latitude: dest.lat, longitude: dest.lng }} tracksViewChanges={!markersReady}>
            <View collapsable={false} style={styles.pin}>
              <Text style={styles.pinText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top card */}
      <View className="absolute left-4 right-4 rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/90" style={{ top: insets.top + 16 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text className="text-xs text-neutral-400">← All trips</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-3">
            {trip && !editing && (
              <TouchableOpacity onPress={() => { setEditTitle(trip.title); setEditStartDate(trip.start_date ?? ''); setEditEndDate(trip.end_date ?? ''); setEditing(true) }}>
                <Text className="text-xs text-neutral-400">✏️ Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDeleteTrip}>
              <Text className="text-xs text-neutral-400">🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {trip ? (
          editing ? (
            <View className="gap-2">
              <TextInput autoFocus value={editTitle} onChangeText={setEditTitle} placeholder="Trip name" placeholderTextColor="#a1a1aa"
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
              <View className="flex-row gap-2">
                <TextInput value={editStartDate} onChangeText={setEditStartDate} placeholder="Start YYYY-MM-DD" placeholderTextColor="#a1a1aa"
                  className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                <TextInput value={editEndDate} onChangeText={setEditEndDate} placeholder="End YYYY-MM-DD" placeholderTextColor="#a1a1aa"
                  className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={handleSaveEdit} disabled={savingEdit || !editTitle.trim()}
                  className="flex-1 items-center rounded-xl bg-teal-500 py-2" style={{ opacity: savingEdit || !editTitle.trim() ? 0.5 : 1 }}>
                  {savingEdit ? <ActivityIndicator size="small" color="white" /> : <Text className="text-xs font-semibold text-white">Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(false)} className="items-center rounded-xl border border-neutral-200 px-4 py-2 dark:border-neutral-700">
                  <Text className="text-xs text-neutral-500">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">{trip.title}</Text>
              {(trip.start_date || trip.end_date) && (
                <Text className="mt-0.5 text-xs text-neutral-400">
                  {formatDate(trip.start_date)}{trip.start_date && trip.end_date ? ' → ' : ''}{formatDate(trip.end_date)}
                </Text>
              )}
            </>
          )
        ) : <ActivityIndicator size="small" color="#0d9488" />}
      </View>

      {/* Bottom card */}
      <View className="absolute left-4 right-4 rounded-2xl border border-neutral-200 bg-white/90 shadow-lg dark:border-neutral-700 dark:bg-neutral-900/90" style={{ bottom: insets.bottom + 16 }}>
        {/* Tab toggle */}
        <View className="flex-row gap-1 p-2">
          {(['destinations', 'itinerary'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} className={`flex-1 items-center rounded-lg py-1.5 ${tab === t ? 'bg-teal-500' : ''}`}>
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
              {sortedDests.length > 0 && (
                <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false} className="mb-3">
                  <View className="gap-1">
                    {sortedDests.map((dest, i) => (
                      <View key={dest.id}>
                        <TouchableOpacity onPress={() => handleZoomTo(dest)} className="flex-row items-center gap-2 rounded-lg px-1 py-1.5">
                          <View className="h-5 w-5 items-center justify-center rounded-full bg-teal-500">
                            <Text className="text-[11px] font-bold text-white">{i + 1}</Text>
                          </View>
                          <Text className="flex-1 text-sm font-medium text-neutral-900 dark:text-white">{dest.city_name}</Text>
                          <Text className="text-xs text-neutral-400">{dest.country_name}</Text>

                          {/* Reorder */}
                          <TouchableOpacity onPress={() => handleReorderDest(dest.id, 'up')} disabled={i === 0} className="px-1" style={{ opacity: i === 0 ? 0.2 : 1 }}>
                            <Text className="text-xs text-neutral-400">↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleReorderDest(dest.id, 'down')} disabled={i === sortedDests.length - 1} className="px-1" style={{ opacity: i === sortedDests.length - 1 ? 0.2 : 1 }}>
                            <Text className="text-xs text-neutral-400">↓</Text>
                          </TouchableOpacity>

                          {/* Note toggle */}
                          <TouchableOpacity onPress={() => { setEditingDestNoteId(editingDestNoteId === dest.id ? null : dest.id); setDestNoteValue(dest.notes ?? '') }} className="px-1">
                            <Text className={`text-xs ${dest.notes ? 'text-teal-500' : 'text-neutral-300'}`}>📝</Text>
                          </TouchableOpacity>

                          {/* Delete */}
                          <TouchableOpacity onPress={() => handleDeleteDest(dest.id)} disabled={deletingDest === dest.id}>
                            {deletingDest === dest.id ? <ActivityIndicator size="small" color="#9ca3af" /> : <Text className="text-xs text-neutral-300">✕</Text>}
                          </TouchableOpacity>
                        </TouchableOpacity>

                        {/* Note */}
                        {dest.notes && editingDestNoteId !== dest.id && (
                          <Text className="mb-1 ml-7 text-xs italic text-neutral-400">{dest.notes}</Text>
                        )}
                        {editingDestNoteId === dest.id && (
                          <View className="mb-1 ml-7 flex-row items-center gap-1.5">
                            <TextInput autoFocus value={destNoteValue} onChangeText={setDestNoteValue} placeholder="Add a note..." placeholderTextColor="#a1a1aa"
                              className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                            <TouchableOpacity onPress={() => handleSaveDestNote(dest.id)} disabled={savingDestNote}
                              className="rounded-lg bg-teal-500 px-2 py-1" style={{ opacity: savingDestNote ? 0.5 : 1 }}>
                              {savingDestNote ? <ActivityIndicator size="small" color="white" /> : <Text className="text-xs font-semibold text-white">Save</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEditingDestNoteId(null)}>
                              <Text className="text-xs text-neutral-400">✕</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <Text className="mb-2 text-xs font-medium text-neutral-400">Add a destination</Text>
              <View className="flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                <TextInput placeholder="Type a city name..." placeholderTextColor="#a1a1aa" value={query} onChangeText={setQuery}
                  className="flex-1 text-sm text-neutral-900 dark:text-white" />
                {searching && <ActivityIndicator size="small" color="#0d9488" />}
              </View>
              {results.length > 0 && (
                <View className="mt-2 gap-0.5">
                  {results.map(r => (
                    <TouchableOpacity key={r.place_id} onPress={() => handleAdd(r)} disabled={adding === r.place_id}
                      className="flex-row items-start gap-2 rounded-lg px-2 py-2" style={{ opacity: adding === r.place_id ? 0.5 : 1 }}>
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
                  const dayItems = items.filter(i => i.day === day).sort((a, b) => a.position - b.position)

                  return (
                    <View key={day}>
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <Text className="text-xs font-semibold text-neutral-900 dark:text-white">{getDayLabel(trip, day)}</Text>
                        <TouchableOpacity onPress={() => { setAddingToDay(addingToDay === day ? null : day); setNewTitle(''); setNewTime(''); setNewNotes('') }}
                          className="rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                          <Text className="text-xs text-neutral-500 dark:text-neutral-400">+ Add</Text>
                        </TouchableOpacity>
                      </View>

                      {dayItems.map((item, idx) => (
                        <View key={item.id} className="mb-1">
                          {editingItemId === item.id ? (
                            <View className="gap-1.5 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800">
                              <TextInput value={editItemTitle} onChangeText={setEditItemTitle} autoFocus placeholder="Activity name..." placeholderTextColor="#a1a1aa"
                                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                              <TextInput value={editItemTime} onChangeText={setEditItemTime} placeholder="Time (e.g. 09:00)" placeholderTextColor="#a1a1aa"
                                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                              <TextInput value={editItemNotes} onChangeText={setEditItemNotes} placeholder="Notes (optional)" placeholderTextColor="#a1a1aa"
                                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                              <View className="flex-row gap-2">
                                <TouchableOpacity onPress={handleSaveEditItem} disabled={savingEditItem || !editItemTitle.trim()}
                                  className="flex-1 items-center rounded-lg bg-teal-500 py-2" style={{ opacity: savingEditItem || !editItemTitle.trim() ? 0.5 : 1 }}>
                                  {savingEditItem ? <ActivityIndicator size="small" color="white" /> : <Text className="text-xs font-semibold text-white">Save</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingItemId(null)} className="items-center rounded-lg border border-neutral-200 px-4 py-2 dark:border-neutral-700">
                                  <Text className="text-xs text-neutral-500">Cancel</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <View>
                              <View className="flex-row items-center gap-2">
                                {/* Done toggle */}
                                <TouchableOpacity onPress={() => handleToggleDone(item.id, item.completed)}
                                  className={`h-4 w-4 items-center justify-center rounded border ${item.completed ? 'border-teal-500 bg-teal-500' : 'border-neutral-300'}`}>
                                  {item.completed && <Text className="text-[10px] font-bold text-white">✓</Text>}
                                </TouchableOpacity>

                                {item.time && <Text className="w-10 text-right text-xs tabular-nums text-neutral-400">{item.time}</Text>}
                                <Text className={`flex-1 text-sm ${!item.time ? 'pl-12' : ''} ${item.completed ? 'text-neutral-400 line-through' : 'text-neutral-900 dark:text-white'}`}>
                                  {item.title}
                                </Text>

                                {/* Reorder */}
                                <TouchableOpacity onPress={() => handleReorderItem(item.id, day, 'up')} disabled={idx === 0} className="px-0.5" style={{ opacity: idx === 0 ? 0.2 : 1 }}>
                                  <Text className="text-xs text-neutral-400">↑</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleReorderItem(item.id, day, 'down')} disabled={idx === dayItems.length - 1} className="px-0.5" style={{ opacity: idx === dayItems.length - 1 ? 0.2 : 1 }}>
                                  <Text className="text-xs text-neutral-400">↓</Text>
                                </TouchableOpacity>

                                {/* Edit */}
                                <TouchableOpacity onPress={() => { setEditingItemId(item.id); setEditItemTitle(item.title); setEditItemTime(item.time ?? ''); setEditItemNotes(item.notes ?? '') }}>
                                  <Text className="text-xs text-neutral-300">✎</Text>
                                </TouchableOpacity>

                                {/* Delete */}
                                <TouchableOpacity onPress={() => handleDeleteItem(item.id)} disabled={deletingItem === item.id}>
                                  {deletingItem === item.id ? <ActivityIndicator size="small" color="#9ca3af" /> : <Text className="text-xs text-neutral-300">✕</Text>}
                                </TouchableOpacity>
                              </View>

                              {item.notes && (
                                <Text className="mt-0.5 pl-6 text-xs italic text-neutral-400">{item.notes}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      ))}

                      {dayItems.length === 0 && addingToDay !== day && (
                        <Text className="text-xs text-neutral-300">No activities yet</Text>
                      )}

                      {addingToDay === day && (
                        <View className="mt-1.5 gap-1.5 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800">
                          <TextInput placeholder="Activity name..." placeholderTextColor="#a1a1aa" value={newTitle} onChangeText={setNewTitle} autoFocus
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                          <TextInput placeholder="Time (optional, e.g. 09:00)" placeholderTextColor="#a1a1aa" value={newTime} onChangeText={setNewTime}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                          <TextInput placeholder="Notes (optional)" placeholderTextColor="#a1a1aa" value={newNotes} onChangeText={setNewNotes}
                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                          <View className="flex-row gap-2">
                            <TouchableOpacity onPress={() => handleAddItem(day)} disabled={savingItem || !newTitle.trim()}
                              className="flex-1 items-center rounded-lg bg-teal-500 py-2" style={{ opacity: savingItem || !newTitle.trim() ? 0.5 : 1 }}>
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
