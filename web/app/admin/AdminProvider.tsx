"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

interface AdminData {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
}

interface AdminContextType {
  admin: AdminData | null
  loading: boolean
}

const AdminContext = createContext<AdminContextType>({ admin: null, loading: true })

export function useAdmin() {
  return useContext(AdminContext)
}

const queryClient = new QueryClient()

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAdmin(data))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AdminContext.Provider value={{ admin, loading }}>
        {children}
      </AdminContext.Provider>
    </QueryClientProvider>
  )
}
