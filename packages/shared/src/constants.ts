export const APP_NAME = 'TripCraft'
export const APP_VERSION = '0.1.0'

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  definite: 'Definitely Doing',
  maybe: 'Maybe',
  interested: 'Interested',
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  activity: 'Activity',
  note: 'Note',
  flight: 'Flight',
}

// Guest sessions expire after 30 days
export const GUEST_SESSION_TTL_DAYS = 30

// Max destinations per trip
export const MAX_DESTINATIONS = 20

// Max items per day in itinerary
export const MAX_ITEMS_PER_DAY = 50
