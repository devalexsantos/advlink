"use client"

import { Controller } from "react-hook-form"
import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useEditForm } from "../EditFormContext"

export default function PerfilContatoSection() {
  const {
    form,
    aboutMarkdown, setAboutMarkdown,
    publicPhoneIsFixed, setPublicPhoneIsFixed,
    whatsappIsFixed, setWhatsappIsFixed,
  } = useEditForm()

  const { control, formState: { errors } } = form

  return (
    <div className="space-y-4">
      {/* Informações básicas */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Label className="text-base font-bold">Informações básicas</Label>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicName" className="mb-1 block text-sm">Nome de exibição <span className="text-red-500" aria-hidden>*</span></Label>
          <Controller
            control={control}
            name="publicName"
            render={({ field }) => (
              <Input id="publicName" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.publicName && <p className="mt-1 text-sm text-red-500">{errors.publicName.message}</p>}
        </div>
        <div>
          <Label htmlFor="headline" className="mb-1 block text-sm">Título</Label>
          <Controller
            control={control}
            name="headline"
            render={({ field }) => (
              <Input id="headline" placeholder="Ex.: Advogado(a) Especialista em Direito Civil" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </div>
      </div>

      {/* Sobre mim */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">Sobre mim</Label>
        <RichTextEditor
          content={aboutMarkdown}
          onChange={(html) => setAboutMarkdown(html)}
          placeholder="Conte um pouco sobre você e sua atuação..."
          minHeight="200px"
        />
      </div>

      {/* Contato */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Label className="text-base font-bold">Contato</Label>
        <div>
          <Label htmlFor="publicEmail" className="mb-1 block text-sm">E-mail para contato</Label>
          <Controller
            control={control}
            name="publicEmail"
            render={({ field }) => (
              <Input id="publicEmail" type="email" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.publicEmail && <p className="mt-1 text-sm text-red-500">{errors.publicEmail.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsapp" className="mb-1 block text-sm">WhatsApp</Label>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="whatsapp"
              render={({ field }) => (
                <Input id="whatsapp" placeholder="(00) 00000-0000" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} className="flex-1 max-w-50" />
              )}
            />
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <Switch checked={whatsappIsFixed} onCheckedChange={setWhatsappIsFixed} />
              <span className="inline-flex items-center gap-1 text-sm">
                Fixar WhatsApp
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="cursor-help" aria-label="Ajuda">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Ao ativar, o botão de WhatsApp ficará fixo no canto inferior direito da sua página.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicPhone" className="mb-1 block text-sm">Telefone</Label>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="publicPhone"
              render={({ field }) => (
                <Input id="publicPhone" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} className="flex-1 max-w-50" />
              )}
            />
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <Switch checked={publicPhoneIsFixed} onCheckedChange={setPublicPhoneIsFixed} />
              <span className="inline-flex items-center gap-1 text-sm">
                Fixar telefone
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="cursor-help" aria-label="Ajuda">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Ao ativar, o botão de telefone ficará fixo no canto inferior direito da sua página.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            </label>
          </div>
        </div>
        <div>
          <Label htmlFor="instagramUrl" className="mb-1 block text-sm">Instagram URL</Label>
          <Controller
            control={control}
            name="instagramUrl"
            render={({ field }) => (
              <Input id="instagramUrl" placeholder="https://instagram.com/seu_usuario" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.instagramUrl && <p className="mt-1 text-sm text-red-500">{errors.instagramUrl.message}</p>}
        </div>
      </div>

      {/* Calendly */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">Agendamento</Label>
        <div>
          <Label htmlFor="calendlyUrl" className="mb-1 block text-sm">Calendly URL</Label>
          <Controller
            control={control}
            name="calendlyUrl"
            render={({ field }) => (
              <Input id="calendlyUrl" placeholder="https://calendly.com/seu-usuario" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.calendlyUrl && <p className="mt-1 text-sm text-red-500">{errors.calendlyUrl.message}</p>}
        </div>
      </div>
    </div>
  )
}
