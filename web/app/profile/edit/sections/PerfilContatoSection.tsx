"use client"

import { Controller } from "react-hook-form"
import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { OabWarnings } from "@/components/oab-warnings"
import { UF_LIST } from "@/lib/oab"
import { formatCnpj } from "@/lib/cnpj"
import { WHATSAPP_MESSAGE_MAX } from "@/lib/whatsapp"
import { useEditForm } from "../EditFormContext"
import { PublicSectionHeader } from "../SectionRenderer"

export default function PerfilContatoSection() {
  const {
    form,
    aboutMarkdown, setAboutMarkdown,
    publicPhoneIsFixed, setPublicPhoneIsFixed,
    whatsappIsFixed, setWhatsappIsFixed,
    onlineService, setOnlineService,
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
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">Como você atua?</legend>
          <Controller
            control={control}
            name="practiceType"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["autonomo", "Advogado(a) autônomo(a)"],
                  ["escritorio", "Escritório"],
                ] as const).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="practiceType"
                      value={value}
                      checked={field.value === value}
                      onChange={() => field.onChange(value)}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          />
        </fieldset>
        <div>
          <div className="grid grid-cols-[1fr_6rem] gap-3 max-w-sm">
            <div>
              <Label htmlFor="oabNumber" className="mb-1 block text-sm">Número da OAB</Label>
              <Controller
                control={control}
                name="oabNumber"
                render={({ field }) => (
                  <Input id="oabNumber" placeholder="Ex.: 123456" autoComplete="off" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </div>
            <div>
              <Label htmlFor="oabState" className="mb-1 block text-sm">UF</Label>
              <Controller
                control={control}
                name="oabState"
                render={({ field }) => (
                  <select
                    id="oabState"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                  >
                    <option value="">UF</option>
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Exibida no seu site, conforme exige o Código de Ética da OAB (art. 44).</p>
          {errors.oabNumber && <p className="mt-1 text-sm text-red-500">{errors.oabNumber.message}</p>}
          {errors.oabState && <p className="mt-1 text-sm text-red-500">{errors.oabState.message}</p>}
        </div>
        <div>
          <Label htmlFor="headline" className="mb-1 block text-sm">Título</Label>
          <Controller
            control={control}
            name="headline"
            render={({ field }) => (
              <Input id="headline" placeholder="Ex.: Advocacia Cível, de Família e Sucessões" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">Use “especialista” apenas se tiver título de especialização (Prov. OAB 205/2021, art. 3º, III).</p>
          <OabWarnings text={form.watch("headline")} />
        </div>
      </div>

      {/* Sobre mim */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">{form.watch("practiceType") === "escritorio" ? "Sobre o escritório" : "Sobre mim"}</Label>
        <PublicSectionHeader sectionKey="sobre" inline />
        <RichTextEditor
          content={aboutMarkdown}
          onChange={(html) => setAboutMarkdown(html)}
          placeholder="Conte um pouco sobre você e sua atuação..."
          minHeight="200px"
        />
        <OabWarnings text={aboutMarkdown} />
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
        <div>
          <Label htmlFor="whatsappMessage" className="mb-1 block text-sm">Mensagem inicial do WhatsApp (opcional)</Label>
          <Controller
            control={control}
            name="whatsappMessage"
            render={({ field }) => (
              <Input id="whatsappMessage" placeholder="Olá, vim pelo seu site." maxLength={WHATSAPP_MESSAGE_MAX} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">Texto que já aparece escrito na conversa quando o visitante clicar no botão de WhatsApp.</p>
          <OabWarnings text={form.watch("whatsappMessage")} />
          {errors.whatsappMessage && <p className="mt-1 text-sm text-red-500">{errors.whatsappMessage.message}</p>}
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
        <div>
          <Label htmlFor="linkedinUrl" className="mb-1 block text-sm">LinkedIn URL</Label>
          <Controller
            control={control}
            name="linkedinUrl"
            render={({ field }) => (
              <Input id="linkedinUrl" placeholder="https://www.linkedin.com/in/seu-perfil" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.linkedinUrl && <p className="mt-1 text-sm text-red-500">{errors.linkedinUrl.message}</p>}
        </div>
        <div>
          <Label htmlFor="facebookUrl" className="mb-1 block text-sm">Facebook URL</Label>
          <Controller
            control={control}
            name="facebookUrl"
            render={({ field }) => (
              <Input id="facebookUrl" placeholder="https://www.facebook.com/sua-pagina" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.facebookUrl && <p className="mt-1 text-sm text-red-500">{errors.facebookUrl.message}</p>}
        </div>
        <div>
          <Label htmlFor="youtubeUrl" className="mb-1 block text-sm">YouTube URL</Label>
          <Controller
            control={control}
            name="youtubeUrl"
            render={({ field }) => (
              <Input id="youtubeUrl" placeholder="https://www.youtube.com/@seu-canal" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.youtubeUrl && <p className="mt-1 text-sm text-red-500">{errors.youtubeUrl.message}</p>}
        </div>
      </div>

      {/* Atendimento */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Label className="text-base font-bold">Atendimento</Label>
        <div>
          <Label htmlFor="officeHours" className="mb-1 block text-sm">Horário de atendimento</Label>
          <Controller
            control={control}
            name="officeHours"
            render={({ field }) => (
              <Input id="officeHours" placeholder="Seg. a sex., 9h às 18h" maxLength={80} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.officeHours && <p className="mt-1 text-sm text-red-500">{errors.officeHours.message}</p>}
        </div>
        <div>
          <Label htmlFor="languages" className="mb-1 block text-sm">Idiomas</Label>
          <Controller
            control={control}
            name="languages"
            render={({ field }) => (
              <Input id="languages" placeholder="Português, Inglês" maxLength={80} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.languages && <p className="mt-1 text-sm text-red-500">{errors.languages.message}</p>}
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <Switch checked={onlineService} onCheckedChange={setOnlineService} aria-label="Atendimento on-line" />
          <span className="text-sm">Atendimento on-line</span>
        </label>
      </div>

      {/* Sociedade de advocacia */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label className="text-base font-bold">Sociedade de advocacia (opcional)</Label>
          <p className="mt-1 text-xs text-muted-foreground">Se você atua por meio de uma sociedade, o CED (art. 44) pede que ela seja identificada na publicidade. Deixe em branco se atua como autônomo(a).</p>
        </div>
        <div>
          <Label htmlFor="firmName" className="mb-1 block text-sm">Nome da sociedade</Label>
          <Controller
            control={control}
            name="firmName"
            render={({ field }) => (
              <Input id="firmName" placeholder="Ex.: Silva & Souza Advogados" maxLength={120} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.firmName && <p className="mt-1 text-sm text-red-500">{errors.firmName.message}</p>}
        </div>
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">Tipo</legend>
          <Controller
            control={control}
            name="firmType"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["individual", "Sociedade Individual de Advocacia"],
                  ["sociedade", "Sociedade de Advogados"],
                ] as const).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="firmType"
                      value={value}
                      checked={field.value === value}
                      onChange={() => field.onChange(value)}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          />
          {form.watch("firmType") && (
            <button type="button" className="mt-1 text-xs text-muted-foreground underline cursor-pointer" onClick={() => form.setValue("firmType", "", { shouldDirty: true })}>
              Limpar tipo
            </button>
          )}
        </fieldset>
        <div>
          <Label htmlFor="firmOabRegistration" className="mb-1 block text-sm">Registro da sociedade na OAB</Label>
          <Controller
            control={control}
            name="firmOabRegistration"
            render={({ field }) => (
              <Input id="firmOabRegistration" placeholder="Ex.: 12345" maxLength={40} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {errors.firmOabRegistration && <p className="mt-1 text-sm text-red-500">{errors.firmOabRegistration.message}</p>}
        </div>
        <div>
          <Label htmlFor="firmCnpj" className="mb-1 block text-sm">CNPJ</Label>
          <Controller
            control={control}
            name="firmCnpj"
            render={({ field }) => (
              <Input
                id="firmCnpj"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={() => { field.onChange(formatCnpj(field.value)); field.onBlur() }}
              />
            )}
          />
          {errors.firmCnpj && <p className="mt-1 text-sm text-red-500">{errors.firmCnpj.message}</p>}
        </div>
      </div>

      {/* Calendly */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Label className="mb-3 text-base block font-bold">Agendamento</Label>
        <PublicSectionHeader sectionKey="calendly" inline />
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
