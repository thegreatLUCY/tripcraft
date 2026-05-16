import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Map, Plus, Sparkles, Users, Globe } from 'lucide-react'
import { type Trip, formatDate } from '@tripcraft/shared'

export default function TripsPanel({ trips }: { trips: Trip[] }) {
  // ── Empty state — no trips yet ──────────────────────────────────────────────
  if (trips.length === 0) {
    return (
      <div className="absolute left-6 top-6 z-[1000] w-full max-w-sm rounded-2xl border border-border bg-background/90 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          AI-powered trip planning
        </div>

        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Your trip.{' '}
          <span className="text-primary">Your way.</span>
        </h1>

        <p className="mb-5 text-sm text-muted-foreground">
          Plan stress-free trips with a map-first interface, AI suggestions,
          and real-time collaboration.
        </p>

        <div className="flex gap-2">
          <Link href="/trips/new" className={cn(buttonVariants({ size: 'sm' }))}>
            Plan a Trip
          </Link>
          <Link href="/demo" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>
            See a Demo
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: Map, label: 'Map-first' },
            { icon: Sparkles, label: 'AI suggestions' },
            { icon: Users, label: 'Collaborative' },
            { icon: Globe, label: 'Works everywhere' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-card-foreground"
            >
              <Icon className="h-3 w-3 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Trips list ───────────────────────────────────────────────────────────────
  return (
    <div className="absolute left-6 top-6 z-[1000] flex w-full max-w-sm flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-xl backdrop-blur-md">
        <h2 className="font-semibold">My Trips</h2>
        <Link
          href="/trips/new"
          className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
        >
          <Plus className="h-3.5 w-3.5" />
          New Trip
        </Link>
      </div>

      {/* Trip cards */}
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        {trips.map(trip => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="rounded-xl border border-border bg-background/90 px-4 py-3 shadow-lg backdrop-blur-md transition-colors hover:bg-accent"
          >
            <p className="font-medium">{trip.title}</p>
            {(trip.start_date || trip.end_date) && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(trip.start_date)}
                {trip.start_date && trip.end_date && ' → '}
                {formatDate(trip.end_date)}
              </p>
            )}
          </Link>
        ))}
      </div>

    </div>
  )
}
