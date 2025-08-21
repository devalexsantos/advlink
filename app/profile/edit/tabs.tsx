"use client"

import { useState } from "react"
import EditProfileForm from "./EditProfileForm"
import Preview from "./Preview"
import { Button } from "@/components/ui/button"
import { Eye, Pencil } from "lucide-react"

export default function MobileTabs() {
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/70 p-3 backdrop-blur-md">
        <Button
          type="button"
          variant={tab === "edit" ? "default" : "secondary"}
          className="flex-1 cursor-pointer"
          onClick={() => setTab("edit")}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
        <Button
          type="button"
          variant={tab === "preview" ? "default" : "secondary"}
          className="flex-1 cursor-pointer"
          onClick={() => setTab("preview")}
        >
          <Eye className="w-4 h-4 mr-2" />
          Visualizar
        </Button>
      </div>
      <div className="p-3">
        {tab === "edit" ? (
          <EditProfileForm />
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
            <h2 className="text-lg font-semibold mb-2 p-4">Pré-visualização</h2>
            <div className="mx-4 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 p-3 flex items-start gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mt-0.5">
              <path fillRule="evenodd" d="M9.401 1.592a2.25 2.25 0 0 1 3.198 0l9.81 10.108c.84.866.24 2.3-.994 2.3h-1.29v5.25a2.25 2.25 0 0 1-2.25 2.25h-3a2.25 2.25 0 0 1-2.25-2.25v-2.25a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v2.25A2.25 2.25 0 0 1 6.375 21.75h-3A2.25 2.25 0 0 1 1.125 19.5V14h-1.29c-1.233 0-1.834-1.434-.994-2.3l9.81-10.108ZM12 3.64 3.144 12.75h1.731a.75.75 0 0 1 .75.75v6a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-2.25A2.25 2.25 0 0 1 12 15h3a2.25 2.25 0 0 1 2.25 2.25v2.25a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 1 .75-.75h1.731L12 3.64Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">Salve as modificações feitas para atualizar o Preview.</p>
          </div>
            <Preview />
          </div>
        )}
      </div>
    </div>
  )
}
