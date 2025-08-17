"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { X, CheckCircle } from "lucide-react"

type Toast = {
  id: string
  message: string
}

type ToastContextValue = {
  showToast: (message: string, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timeoutsRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback((message: string, durationMs = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, message }])
    const timeout = setTimeout(() => removeToast(id), durationMs)
    timeoutsRef.current.set(id, timeout)
  }, [removeToast])

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed left-4 bottom-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-md border border-green-600/30 bg-zinc-900 px-4 py-3 shadow-lg">
            <CheckCircle className="w-8 h-8" style={{ color: "#22c55e" }} />
            <span className="text-sm font-semibold text-zinc-100">{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="ml-2 text-zinc-400 hover:text-zinc-200"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}


