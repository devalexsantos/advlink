"use client"

import { useState, useMemo } from "react"
import { icons, Ban } from "lucide-react"
import { CURATED_ICONS } from "@/lib/curated-icons"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type IconPickerProps = {
  value: string
  onChange: (iconName: string) => void
  children: React.ReactNode
}

export function IconPicker({ value, onChange, children }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return CURATED_ICONS as unknown as string[]
    return (CURATED_ICONS as unknown as string[]).filter((name) =>
      name.toLowerCase().includes(q),
    )
  }, [search])

  const CurrentIcon = value ? (icons as Record<string, React.ElementType>)[value] : null
  const showNone = !search || "nenhum".includes(search.toLowerCase())

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch("") }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Escolher ícone</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar ícone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto py-2">
          {showNone && (
            <button
              type="button"
              className={`flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors cursor-pointer ${value === "" ? "bg-accent ring-2 ring-primary" : ""}`}
              onClick={() => { onChange(""); setOpen(false); setSearch("") }}
              title="Nenhum"
            >
              <Ban className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          {filtered.map((name) => {
            const Icon = (icons as Record<string, React.ElementType>)[name]
            if (!Icon) return null
            return (
              <button
                key={name}
                type="button"
                className={`flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors cursor-pointer ${value === name ? "bg-accent ring-2 ring-primary" : ""}`}
                onClick={() => { onChange(name); setOpen(false); setSearch("") }}
                title={name}
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          })}
          {filtered.length === 0 && !showNone && (
            <p className="col-span-6 text-sm text-muted-foreground text-center py-4">
              Nenhum ícone encontrado
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
          {CurrentIcon ? (
            <><CurrentIcon className="h-4 w-4" /> Atual: {value}</>
          ) : (
            <><Ban className="h-4 w-4" /> Atual: Nenhum</>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
