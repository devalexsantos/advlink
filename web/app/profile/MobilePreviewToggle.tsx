"use client"

import { usePathname } from "next/navigation"
import { Eye, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMobilePreview } from "./MobilePreviewContext"

export function MobilePreviewToggle() {
  const pathname = usePathname()
  const { mobilePreview, setMobilePreview } = useMobilePreview()

  // Only show on the edit page
  if (pathname !== "/profile/edit") return null

  return mobilePreview ? (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={() => setMobilePreview(false)}>
      <Pencil className="h-3.5 w-3.5" />
      Editar
    </Button>
  ) : (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={() => setMobilePreview(true)}>
      <Eye className="h-3.5 w-3.5" />
      Pré-visualizar
    </Button>
  )
}
