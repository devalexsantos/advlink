"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useEditForm } from "../EditFormContext"

export default function SEOSection() {
  const { form } = useEditForm()
  const { register } = form

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Label className="text-base font-bold">Meta Tags</Label>
        <div>
          <Label htmlFor="metaTitle" className="mb-1 block text-sm">Meta Title</Label>
          <Input id="metaTitle" maxLength={80} placeholder="Título curto e persuasivo (até 80 caracteres)" {...register("metaTitle")} />
        </div>
        <div>
          <Label htmlFor="metaDescription" className="mb-1 block text-sm">Meta Description</Label>
          <Textarea id="metaDescription" rows={3} placeholder="Descrição curta e persuasiva" {...register("metaDescription")} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">Palavras-chave</Label>
        <div>
          <Label htmlFor="keywords" className="mb-1 block text-sm">Keywords</Label>
          <Input id="keywords" placeholder="ex.: advocacia civil, direito do consumidor" {...register("keywords")} />
          <p className="mt-1 text-xs text-muted-foreground">Separe por vírgulas.</p>
        </div>
      </div>
    </div>
  )
}
