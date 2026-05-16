import type { ItineraryItemType, ActivityStatus } from './types'

export const APP_NAME = 'TripCraft'
export const APP_VERSION = '0.1.0'

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  definite: 'Definitely',
  maybe: 'Maybe',
  interested: 'Interested',
}

export const ITEM_TYPE_LABELS: Record<ItineraryItemType, string> = {
  activity: 'Activity',
  hotel: 'Hotel',
  flight: 'Flight',
  note: 'Note',
}

// Emoji so the same source renders on web and React Native.
export const ITEM_TYPE_ICONS: Record<ItineraryItemType, string> = {
  activity: '📍',
  hotel: '🏨',
  flight: '✈️',
  note: '🗒️',
}

// Tailwind text-color classes shared by both apps.
export const ACTIVITY_STATUS_COLORS: Record<ActivityStatus, string> = {
  definite: 'text-teal-500',
  maybe: 'text-amber-500',
  interested: 'text-neutral-400',
}

export const ITEM_TYPES: ItineraryItemType[] = ['activity', 'hotel', 'flight', 'note']
export const ACTIVITY_STATUSES: ActivityStatus[] = ['definite', 'maybe', 'interested']

// Guest sessions expire after 30 days
export const GUEST_SESSION_TTL_DAYS = 30

// Max destinations per trip
export const MAX_DESTINATIONS = 20

// Max items per day in itinerary
export const MAX_ITEMS_PER_DAY = 50
