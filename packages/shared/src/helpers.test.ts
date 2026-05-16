import { describe, it, expect } from 'vitest'
import { extractCity, formatDate, getDays, getDayLabel } from './helpers'
import type { Trip, ItineraryItem, NominatimResult } from './types'

const trip = (start: string | null, end: string | null): Trip => ({
  id: 't1', title: 'Trip', start_date: start, end_date: end,
})

const item = (day: number): ItineraryItem => ({
  id: `i${day}`, day, title: 'x', time: null, notes: null, completed: false, position: 1,
})

describe('formatDate', () => {
  it('returns null for null', () => {
    expect(formatDate(null)).toBeNull()
  })
  it('formats an ISO date', () => {
    expect(formatDate('2025-07-01')).toBe('Jul 1, 2025')
  })
})

describe('getDays', () => {
  it('derives an inclusive day range from trip dates', () => {
    // Jul 1 → Jul 3 is 3 days
    expect(getDays(trip('2025-07-01', '2025-07-03'), [])).toEqual([1, 2, 3])
  })

  it('caps long trips at 30 days', () => {
    expect(getDays(trip('2025-01-01', '2025-12-31'), [])).toHaveLength(30)
  })

  it('with no dates, returns existing item days plus one trailing day', () => {
    expect(getDays(trip(null, null), [item(1), item(3)])).toEqual([1, 3, 4])
  })

  it('with no dates and no items, returns a single empty day', () => {
    expect(getDays(null, [])).toEqual([1])
  })
})

describe('getDayLabel', () => {
  it('falls back to "Day N" with no start date', () => {
    expect(getDayLabel(null, 2)).toBe('Day 2')
  })
  it('labels with the real calendar date when a start date is set', () => {
    // 2025-07-01 is a Tuesday; day 1 is that day
    expect(getDayLabel(trip('2025-07-01', null), 1)).toBe('Tue, Jul 1')
  })
})

describe('extractCity', () => {
  const base = { place_id: 1, display_name: 'Somewhere, Country', lat: '0', lon: '0' }

  it('prefers city over other address parts', () => {
    const r: NominatimResult = { ...base, address: { city: 'Paris', town: 'X', country: 'France' } }
    expect(extractCity(r)).toBe('Paris')
  })

  it('falls back through town/municipality/village', () => {
    const r: NominatimResult = { ...base, address: { village: 'Halstatt', country: 'Austria' } }
    expect(extractCity(r)).toBe('Halstatt')
  })

  it('falls back to the first part of display_name', () => {
    const r: NominatimResult = { ...base, address: { country: 'Nowhere' } }
    expect(extractCity(r)).toBe('Somewhere')
  })
})
