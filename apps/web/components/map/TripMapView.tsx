'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'

type Destination = {
  id: string
  city_name: string
  country_name: string
  lat: number
  lng: number
}

function createPin(number: number, highlighted = false) {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="
      width:32px;height:32px;
      background:${highlighted ? '#0f766e' : '#0d9488'};
      border-radius:50%;
      border:${highlighted ? '3px' : '2.5px'} solid white;
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:13px;font-weight:700;
      box-shadow:0 2px ${highlighted ? '10px' : '6px'} rgba(0,0,0,${highlighted ? '0.4' : '0.25'});
      transform:${highlighted ? 'scale(1.2)' : 'scale(1)'};
      transition:all 0.2s;
    ">${number}</div>`,
  })
}

function FitBounds({ destinations }: { destinations: Destination[] }) {
  const map = useMap()
  useEffect(() => {
    if (destinations.length === 0) return
    if (destinations.length === 1) {
      map.setView([destinations[0].lat, destinations[0].lng], 10)
      return
    }
    const bounds = L.latLngBounds(destinations.map(d => [d.lat, d.lng]))
    map.fitBounds(bounds, { padding: [60, 60] })
  }, [destinations, map])
  return null
}

function ZoomTo({ destinations, targetId }: { destinations: Destination[], targetId: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!targetId) return
    const dest = destinations.find(d => d.id === targetId)
    if (dest) map.flyTo([dest.lat, dest.lng], 12, { duration: 1 })
  }, [targetId])
  return null
}

export default function TripMapView({
  destinations,
  zoomToId = null,
}: {
  destinations: Destination[]
  zoomToId?: string | null
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <FitBounds destinations={destinations} />
      <ZoomTo destinations={destinations} targetId={zoomToId} />
      {destinations.map((dest, index) => (
        <Marker
          key={dest.id}
          position={[dest.lat, dest.lng]}
          icon={createPin(index + 1, dest.id === zoomToId)}
        >
          <Popup>
            <strong>{dest.city_name}</strong><br />{dest.country_name}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
