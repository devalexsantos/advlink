"use client"

import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useEditForm } from "../EditFormContext"

export default function SEOSection() {
  const { form } = useEditForm()
  const { control, formState: { errors } } = form

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Label className="text-base font-bold">Meta Tags</Label>
        <div>
          <Label htmlFor="metaTitle" className="mb-1 block text-sm">Meta Title</Label>
          <Controller
            control={control}
            name="metaTitle"
            render={({ field }) => (
              <Input id="metaTitle" maxLength={80} placeholder="Título curto e persuasivo (até 80 caracteres)" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </div>
        <div>
          <Label htmlFor="metaDescription" className="mb-1 block text-sm">Meta Description</Label>
          <Controller
            control={control}
            name="metaDescription"
            render={({ field }) => (
              <Textarea id="metaDescription" rows={3} placeholder="Descrição curta e persuasiva" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">Palavras-chave</Label>
        <div>
          <Label htmlFor="keywords" className="mb-1 block text-sm">Keywords</Label>
          <Controller
            control={control}
            name="keywords"
            render={({ field }) => (
              <Input id="keywords" placeholder="ex.: advocacia civil, direito do consumidor" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">Separe por vírgulas.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">Google Tag Manager</Label>
        <div>
          <Label htmlFor="gtmContainerId" className="mb-1 block text-sm">Container ID</Label>
          <Controller
            control={control}
            name="gtmContainerId"
            render={({ field }) => (
              <Input id="gtmContainerId" placeholder="GTM-XXXXXXX" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.gtmContainerId && <p className="mt-1 text-sm text-red-500">{errors.gtmContainerId.message}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Encontre seu ID no <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Tag Manager</a> → Administrador → Informações do contêiner.
          </p>
        </div>
      </div>
    </div>
  )
}
