'use client'

import dynamic from 'next/dynamic'
import type { Destination } from '@tripcraft/shared'

// Leaflet touches window, so it must stay out of SSR.
const TripMapView = dynamic(() => import('./TripMapView'), { ssr: false })

export default function MapWrapper({ destinations }: { destinations: Destination[] }) {
  return <TripMapView destinations={destinations} />
}
