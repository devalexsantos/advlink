"use client"

import { useState } from "react"
import EditProfileForm from "./EditProfileForm"
import Preview from "./Preview"
import { Button } from "@/components/ui/button"

export default function MobileTabs() {
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/70 p-3 backdrop-blur-md">
        <Button
          type="button"
          variant={tab === "edit" ? "default" : "secondary"}
          className="flex-1 cursor-pointer"
          onClick={() => setTab("edit")}
        >
          Editar
        </Button>
        <Button
          type="button"
          variant={tab === "preview" ? "default" : "secondary"}
          className="flex-1 cursor-pointer"
          onClick={() => setTab("preview")}
        >
          Visualizar
        </Button>
      </div>
      <div className="h-[calc(100vh-52px)] overflow-y-auto p-3">
        {tab === "edit" ? (
          <EditProfileForm />
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
            <h2 className="text-lg font-semibold mb-2 p-4">Pré-visualização</h2>
            <Preview />
          </div>
        )}
      </div>
    </div>
  )
}
