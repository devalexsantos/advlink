import { Suspense } from "react"
import { AdminLayoutClient } from "./AdminLayoutClient"
import type { Metadata } from "next"

// Private area: never indexed
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  )
}
