'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Loader2, X, Trash2, Map, CalendarDays,
  Plus, Pencil, ChevronUp, ChevronDown, Check, StickyNote, GripVertical, // ChevronUp/Down still used for itinerary reorder
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TripMapView = dynamic(() => import('@/components/map/TripMapView'), { ssr: false })

type Destination = {
  id: string
  city_name: string
  country_name: string
  lat: number
  lng: number
  notes: string | null
  position: number
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
  notes: string | null
  completed: boolean
  position: number
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

type DestRowProps = {
  dest: Destination
  index: number
  total: number
  zoomToId: string | null
  deletingDest: string | null
  editingDestNoteId: string | null
  destNoteValue: string
  savingDestNote: boolean
  onZoom: (id: string) => void
  onDelete: (id: string) => void
  onNoteToggle: (id: string, current: string) => void
  onNoteChange: (v: string) => void
  onNoteSave: (id: string) => void
  onNoteCancel: () => void
}

function SortableDestinationItem(props: DestRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.dest.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const { dest, index, zoomToId, deletingDest, editingDestNoteId, destNoteValue, savingDestNote } = props

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-accent/40 ${zoomToId === dest.id ? 'bg-accent/40' : ''}`}
        onClick={() => props.onZoom(dest.id)}
      >
        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          onClick={e => e.stopPropagation()}
          className="cursor-grab touch-none text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium">{dest.city_name}</span>
        <span className="text-xs text-muted-foreground">{dest.country_name}</span>

        {/* Note toggle */}
        <button
          onClick={e => { e.stopPropagation(); props.onNoteToggle(dest.id, dest.notes ?? '') }}
          className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <StickyNote className={`h-3.5 w-3.5 ${dest.notes ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); props.onDelete(dest.id) }}
          disabled={deletingDest === dest.id}
          className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
        >
          {deletingDest === dest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Note display / edit */}
      {dest.notes && editingDestNoteId !== dest.id && (
        <p className="mb-0.5 ml-8 text-xs italic text-muted-foreground">{dest.notes}</p>
      )}
      {editingDestNoteId === dest.id && (
        <div className="mb-1 ml-8 flex items-center gap-1.5">
          <input
            autoFocus value={destNoteValue} onChange={e => props.onNoteChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && props.onNoteSave(dest.id)}
            placeholder="Add a note..."
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={() => props.onNoteSave(dest.id)} disabled={savingDestNote}
            className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50">
            {savingDestNote ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
          </button>
          <button onClick={props.onNoteCancel} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}
    </div>
  )
}

function extractCity(r: NominatimResult) {
  return r.address.city ?? r.address.town ?? r.address.municipality ?? r.address.village ?? r.display_name.split(',')[0]
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDays(trip: Trip, items: ItineraryItem[]): number[] {
  if (trip.start_date && trip.end_date) {
    const start = new Date(trip.start_date + 'T00:00')
    const end = new Date(trip.end_date + 'T00:00')
    const count = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
    return Array.from({ length: Math.min(count, 30) }, (_, i) => i + 1)
  }
  const existing = [...new Set(items.map(i => i.day))].sort((a, b) => a - b)
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return [...existing, next]
}

function getDayLabel(trip: Trip, day: number): string {
  if (!trip.start_date) return `Day ${day}`
  const date = new Date(trip.start_date + 'T00:00')
  date.setDate(date.getDate() + day - 1)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TripDetailClient({
  trip,
  initialDestinations,
  initialItems,
}: {
  trip: Trip
  initialDestinations: Destination[]
  initialItems: ItineraryItem[]
}) {
  const [tab, setTab] = useState<'map' | 'itinerary'>('map')
  const router = useRouter()

  // ── Trip ────────────────────────────────────────────────────────────────────
  const [tripData, setTripData] = useState(trip)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(trip.title)
  const [editStartDate, setEditStartDate] = useState(trip.start_date ?? '')
  const [editEndDate, setEditEndDate] = useState(trip.end_date ?? '')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingTrip, setDeletingTrip] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Drag-to-reorder sensors ──────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Destinations ─────────────────────────────────────────────────────────────
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations)
  const [zoomToId, setZoomToId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [deletingDest, setDeletingDest] = useState<string | null>(null)
  const [editingDestNoteId, setEditingDestNoteId] = useState<string | null>(null)
  const [destNoteValue, setDestNoteValue] = useState('')
  const [savingDestNote, setSavingDestNote] = useState(false)

  // ── Itinerary ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItineraryItem[]>(initialItems)
  const [addingToDay, setAddingToDay] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemTitle, setEditItemTitle] = useState('')
  const [editItemTime, setEditItemTime] = useState('')
  const [editItemNotes, setEditItemNotes] = useState('')
  const [savingEditItem, setSavingEditItem] = useState(false)

  // ── Destination search ───────────────────────────────────────────────────────
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

  // ── Sorted views ─────────────────────────────────────────────────────────────
  const sortedDests = [...destinations].sort((a, b) => a.position - b.position)
  const days = getDays(tripData, items)

  // ── Trip handlers ─────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editTitle.trim()) return
    if (editStartDate && editEndDate && editEndDate < editStartDate) {
      setEditError('End date cannot be before start date')
      return
    }
    setSavingEdit(true)
    setEditError(null)
    const { error } = await supabase
      .from('trips')
      .update({ title: editTitle.trim(), start_date: editStartDate || null, end_date: editEndDate || null })
      .eq('id', trip.id)
    if (error) {
      setEditError(error.message)
    } else {
      setTripData(prev => ({ ...prev, title: editTitle.trim(), start_date: editStartDate || null, end_date: editEndDate || null }))
      setEditing(false)
    }
    setSavingEdit(false)
  }

  async function handleDeleteTrip() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletingTrip(true)
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    if (!error) router.push('/')
    else setDeletingTrip(false)
  }

  // ── Destination handlers ──────────────────────────────────────────────────────
  async function handleAddDest(result: NominatimResult) {
    setAdding(result.place_id)
    const cityName = extractCity(result)
    const countryName = result.address.country ?? ''
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const nextPosition = destinations.length + 1

    const { data, error } = await supabase
      .from('trip_destinations')
      .insert({ trip_id: trip.id, city_name: cityName, country_name: countryName, lat, lng, notes: null, position: nextPosition })
      .select('id, city_name, country_name, lat, lng, notes, position')
      .single()

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
    const { error } = await supabase
      .from('trip_destinations')
      .update({ notes: destNoteValue.trim() || null })
      .eq('id', destId)
    if (!error) {
      setDestinations(prev => prev.map(d => d.id === destId ? { ...d, notes: destNoteValue.trim() || null } : d))
      setEditingDestNoteId(null)
    }
    setSavingDestNote(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedDests.findIndex(d => d.id === active.id)
    const newIndex = sortedDests.findIndex(d => d.id === over.id)
    const reordered = arrayMove(sortedDests, oldIndex, newIndex).map((d, i) => ({ ...d, position: i + 1 }))
    setDestinations(reordered)
    await Promise.all(reordered.map((d, i) => supabase.from('trip_destinations').update({ position: i + 1 }).eq('id', d.id)))
  }

  // ── Itinerary handlers ────────────────────────────────────────────────────────
  async function handleAddItem(day: number) {
    if (!newTitle.trim()) return
    setSavingItem(true)
    setItemError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const dayItems = items.filter(i => i.day === day)
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({ trip_id: trip.id, day, title: newTitle.trim(), time: newTime || null, notes: newNotes.trim() || null, completed: false, position: dayItems.length + 1, user_id: user!.id })
      .select('id, day, title, time, notes, completed, position')
      .single()
    if (error) {
      setItemError(error.message)
    } else if (data) {
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
    await Promise.all([
      supabase.from('itinerary_items').update({ position: b.position }).eq('id', a.id),
      supabase.from('itinerary_items').update({ position: a.position }).eq('id', b.id),
    ])
    setItems(prev => prev.map(i => {
      if (i.id === a.id) return { ...i, position: b.position }
      if (i.id === b.id) return { ...i, position: a.position }
      return i
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <div className="absolute inset-0">
        <TripMapView destinations={sortedDests} zoomToId={zoomToId} />
      </div>

      <div className="absolute left-6 top-6 z-[1000] flex w-full max-w-sm flex-col gap-3">

        {/* Header */}
        <div className="rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-xl backdrop-blur-md">
          <Link href="/" className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> All trips
          </Link>
          {editing ? (
            <div className="flex flex-col gap-2">
              <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex gap-2">
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
                <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
              </div>
              {editError && <p className="text-xs text-destructive">{editError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEditError(null); setEditTitle(tripData.title); setEditStartDate(tripData.start_date ?? ''); setEditEndDate(tripData.end_date ?? '') }}
                  className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold">{tripData.title}</h1>
                {(tripData.start_date || tripData.end_date) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(tripData.start_date)}{tripData.start_date && tripData.end_date && ' → '}{formatDate(tripData.end_date)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleDeleteTrip} disabled={deletingTrip} onBlur={() => setConfirmDelete(false)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${confirmDelete ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground hover:text-destructive'}`}>
                  {deletingTrip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : confirmDelete ? 'Confirm delete' : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl border border-border bg-background/90 p-1 shadow-xl backdrop-blur-md">
          {(['map', 'itinerary'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'map' ? <Map className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
              {t === 'map' ? 'Destinations' : 'Itinerary'}
            </button>
          ))}
        </div>

        {/* ── Destinations tab ── */}
        {tab === 'map' && (
          <>
            {sortedDests.length > 0 && (
              <div className="flex max-h-56 flex-col overflow-y-auto rounded-2xl border border-border bg-background/90 px-3 py-2 shadow-xl backdrop-blur-md">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedDests.map(d => d.id)} strategy={verticalListSortingStrategy}>
                    {sortedDests.map((dest, i) => (
                      <SortableDestinationItem
                        key={dest.id}
                        dest={dest}
                        index={i}
                        total={sortedDests.length}
                        zoomToId={zoomToId}
                        deletingDest={deletingDest}
                        editingDestNoteId={editingDestNoteId}
                        destNoteValue={destNoteValue}
                        savingDestNote={savingDestNote}
                        onZoom={id => setZoomToId(zoomToId === id ? null : id)}
                        onDelete={handleDeleteDest}
                        onNoteToggle={(id, current) => { setEditingDestNoteId(editingDestNoteId === id ? null : id); setDestNoteValue(current) }}
                        onNoteChange={setDestNoteValue}
                        onNoteSave={handleSaveDestNote}
                        onNoteCancel={() => setEditingDestNoteId(null)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Search */}
            <div className="rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-xl backdrop-blur-md">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Add a destination</p>
              <div className="relative">
                <input type="text" placeholder="Type a city name..." value={query} onChange={e => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
                {searching && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              {results.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {results.map(r => (
                    <button key={r.place_id} onClick={() => handleAddDest(r)} disabled={adding === r.place_id}
                      className="flex items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{extractCity(r)}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.display_name}</p>
                      </div>
                      {adding === r.place_id && <Loader2 className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Itinerary tab ── */}
        {tab === 'itinerary' && (
          <div className="flex max-h-[60vh] flex-col gap-0 overflow-y-auto rounded-2xl border border-border bg-background/90 shadow-xl backdrop-blur-md">
            {days.map((day, dayIdx) => {
              const dayItems = items
                .filter(i => i.day === day)
                .sort((a, b) => a.position - b.position)

              return (
                <div key={day} className={`px-4 py-3 ${dayIdx < days.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">{getDayLabel(tripData, day)}</span>
                    <button
                      onClick={() => { setAddingToDay(addingToDay === day ? null : day); setNewTitle(''); setNewTime(''); setNewNotes('') }}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  {dayItems.length > 0 && (
                    <div className="mb-2 flex flex-col gap-1">
                      {dayItems.map((item, idx) => (
                        <div key={item.id}>
                          {editingItemId === item.id ? (
                            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2">
                              <input autoFocus value={editItemTitle} onChange={e => setEditItemTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEditItem()}
                                className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring" />
                              <input type="time" value={editItemTime} onChange={e => setEditItemTime(e.target.value)}
                                className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring" />
                              <input value={editItemNotes} onChange={e => setEditItemNotes(e.target.value)}
                                placeholder="Notes (optional)..."
                                className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
                              <div className="flex gap-1.5">
                                <button onClick={handleSaveEditItem} disabled={savingEditItem || !editItemTitle.trim()}
                                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
                                  {savingEditItem ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                </button>
                                <button onClick={() => setEditingItemId(null)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="group flex items-center gap-1.5 text-sm">
                              {/* Done toggle */}
                              <button onClick={() => handleToggleDone(item.id, item.completed)}
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${item.completed ? 'border-primary bg-primary' : 'border-muted-foreground hover:border-primary'}`}>
                                {item.completed && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </button>

                              {item.time && (
                                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{item.time}</span>
                              )}
                              <span className={`flex-1 ${!item.time ? 'pl-10' : ''} ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                                {item.title}
                              </span>

                              {/* Reorder */}
                              <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                                <button onClick={() => handleReorderItem(item.id, day, 'up')} disabled={idx === 0}
                                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20">
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button onClick={() => handleReorderItem(item.id, day, 'down')} disabled={idx === dayItems.length - 1}
                                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20">
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Edit — always visible */}
                              <button onClick={() => { setEditingItemId(item.id); setEditItemTitle(item.title); setEditItemTime(item.time ?? ''); setEditItemNotes(item.notes ?? '') }}
                                className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground">
                                <Pencil className="h-3 w-3" />
                              </button>

                              {/* Delete */}
                              <button onClick={() => handleDeleteItem(item.id)} disabled={deletingItem === item.id}
                                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50">
                                {deletingItem === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                              </button>
                            </div>
                          )}

                          {/* Item notes */}
                          {editingItemId !== item.id && item.notes && (
                            <p className="mt-0.5 pl-6 text-xs italic text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add form */}
                  {addingToDay === day && (
                    <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2">
                      <input autoFocus type="text" placeholder="Activity name..." value={newTitle} onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddItem(day)}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      <div className="flex gap-1.5">
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                      <input type="text" placeholder="Notes (optional)..." value={newNotes} onChange={e => setNewNotes(e.target.value)}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
                      {itemError && <p className="text-xs text-destructive">{itemError}</p>}
                      <div className="flex gap-1.5">
                        <button onClick={() => handleAddItem(day)} disabled={savingItem || !newTitle.trim()}
                          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
                          {savingItem ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </button>
                        <button onClick={() => { setAddingToDay(null); setItemError(null) }} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    </div>
                  )}

                  {dayItems.length === 0 && addingToDay !== day && (
                    <p className="text-xs text-muted-foreground/60">No activities yet</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
