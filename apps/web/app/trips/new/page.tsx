'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
export default function NewTripPage() {
  const router = useRouter()

  // Each piece of form state lives here — React keeps the input in sync with this
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // stops the browser from reloading the page on submit
    setLoading(true)

    setError(null)


    if (startDate && endDate && endDate < startDate){
      setError('End Date cannot be before start date')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('trips').insert({
      title,
      start_date: startDate || null,
      end_date: endDate || null,
      user_id: user!.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/') // redirect to homepage on success
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Plan a Trip</h1>
        <p className="mt-2 text-muted-foreground">
          Start with the basics — you can add destinations and activities after.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Trip title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Trip name <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Summer in Japan"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="start" className="text-sm font-medium">
              Start date
            </label>
            <input
              id="start"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="end" className="text-sm font-medium">
              End date
            </label>
            <input
              id="end"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className={cn(
              buttonVariants(),
              'flex-1',
              (loading || !title.trim()) && 'cursor-not-allowed opacity-50'
            )}
          >
            {loading ? 'Saving...' : 'Create Trip'}
          </button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancel
          </Link>
        </div>

      </form>
    </div>
  )
}
