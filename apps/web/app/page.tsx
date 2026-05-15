import { buttonVariants } from '@/components/ui/button'
import { Map, Sparkles, Users, Globe } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          AI-powered trip planning
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your trip.{' '}
          <span className="text-primary">Your way.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-lg">
          Plan stress-free trips with a beautiful map-first interface, AI
          suggestions, and real-time collaboration. No clutter, just clarity.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/trips/new" className={cn(buttonVariants({ size: 'lg' }))}>
            Plan a Trip
          </Link>
          <Link href="/demo" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
            See a Demo
          </Link>
        </div>
      </div>

      {/* Feature pills */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
        {[
          { icon: Map, label: 'Map-first view' },
          { icon: Sparkles, label: 'AI suggestions' },
          { icon: Users, label: 'Collaborative planning' },
          { icon: Globe, label: 'Works everywhere' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
