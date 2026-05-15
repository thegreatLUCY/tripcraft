'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Map, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render theme toggle after hydration to avoid mismatch
  useEffect(() => setMounted(true), [])

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Map className="h-4 w-4" />
          </div>
          <span className="text-sm tracking-tight">TripCraft</span>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Trip
          </Button>

          {/* Theme toggle — only renders after mount */}
          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="size-8" />
          )}
        </div>
      </div>
    </header>
  )
}
