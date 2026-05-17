'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type ToastItem = { id: number; message: string }

const ToastContext = createContext<(message: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[2000] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className="pointer-events-auto rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
