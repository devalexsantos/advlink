"use client"

import { Suspense } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditFormProvider, useEditForm } from "./EditFormContext"
import SectionRenderer from "./SectionRenderer"
import Preview from "./Preview"
import SubscribeCTA from "./SubscribeCTA"
import PublishedCTA from "./PublishedCTA"
import { useMobilePreview } from "../MobilePreviewContext"

function PreviewBanner({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 p-3 flex items-start gap-2 ${className ?? ""}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mt-0.5 shrink-0">
        <path fillRule="evenodd" d="M9.401 1.592a2.25 2.25 0 0 1 3.198 0l9.81 10.108c.84.866.24 2.3-.994 2.3h-1.29v5.25a2.25 2.25 0 0 1-2.25 2.25h-3a2.25 2.25 0 0 1-2.25-2.25v-2.25a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v2.25A2.25 2.25 0 0 1 6.375 21.75h-3A2.25 2.25 0 0 1 1.125 19.5V14h-1.29c-1.233 0-1.834-1.434-.994-2.3l9.81-10.108ZM12 3.64 3.144 12.75h1.731a.75.75 0 0 1 .75.75v6a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-2.25A2.25 2.25 0 0 1 12 15h3a2.25 2.25 0 0 1 2.25 2.25v2.25a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 1 .75-.75h1.731L12 3.64Z" clipRule="evenodd" />
      </svg>
      <p className="text-sm">Salve as modificações feitas para atualizar o Preview.</p>
    </div>
  )
}

function EditDashboardInner({ isActive, slug }: { isActive: boolean; slug?: string }) {
  const { saveProfileMutation } = useEditForm()
  const { mobilePreview } = useMobilePreview()

  return (
    <div className="space-y-4">
      {/* CTA bar */}
      {!isActive ? <SubscribeCTA /> : <PublishedCTA slug={slug} />}

      {/* Desktop: 2 columns */}
      <div className="hidden lg:grid grid-cols-[1fr_1fr] gap-6 items-start">
        <div className="max-w-[640px] space-y-4">
          <Suspense fallback={null}>
            <SectionRenderer />
          </Suspense>
          <div className="flex justify-end">
            <Button type="submit" disabled={saveProfileMutation.isPending} className="gap-2 cursor-pointer">
              <Save className="w-4 h-4" />
              {saveProfileMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card sticky top-4">
          <h2 className="text-lg font-semibold mb-2 p-4">Pré-visualização</h2>
          <PreviewBanner className="mx-4 mb-2" />
          <Preview />
        </div>
      </div>

      {/* Mobile: editor or preview */}
      {!mobilePreview ? (
        <>
          <div className="lg:hidden max-w-[640px] space-y-4">
            <Suspense fallback={null}>
              <SectionRenderer />
            </Suspense>
          </div>
          {/* Mobile: floating save button */}
          <Button type="submit" disabled={saveProfileMutation.isPending} aria-label="Salvar" size="icon"
            className="lg:hidden fixed bottom-4 right-4 z-20 shadow-lg h-12 w-12 rounded-full">
            <Save className="w-6 h-6" />
          </Button>
        </>
      ) : (
        <div className="lg:hidden">
          <div className="rounded-xl border border-border bg-card">
            <PreviewBanner className="mx-4 mt-4 mb-2" />
            <Preview />
          </div>
        </div>
      )}
    </div>
  )
}

export default function EditDashboard({ isActive, slug }: { isActive: boolean; slug?: string }) {
  return (
    <EditFormProvider>
      <EditDashboardInner isActive={isActive} slug={slug} />
    </EditFormProvider>
  )
}
