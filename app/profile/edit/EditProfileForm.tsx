"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Pencil, Plus, Save, Trash2, Upload, WandSparkles, X, ArrowDown, ArrowUp } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import TurndownService from "turndown"
import { marked } from "marked"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const profileEditSchema = z.object({
  publicName: z.string().min(2, "Informe pelo menos 2 caracteres."),
  aboutDescription: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  publicEmail: z
    .string()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  publicPhone: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  whatsapp: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  calendlyUrl: z
    .string()
    .url("Informe uma URL válida.")
    .regex(/^https:\/\/calendly\.com\//i, "A URL deve iniciar com https://calendly.com/")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Address (all optional)
  addressPublic: z.boolean().optional(),
  zipCode: z.string().optional().or(z.literal("").transform(() => undefined)),
  street: z.string().optional().or(z.literal("").transform(() => undefined)),
  number: z.string().optional().or(z.literal("").transform(() => undefined)),
  complement: z.string().optional().or(z.literal("").transform(() => undefined)),
  neighborhood: z.string().optional().or(z.literal("").transform(() => undefined)),
  city: z.string().optional().or(z.literal("").transform(() => undefined)),
  state: z.string().optional().or(z.literal("").transform(() => undefined)),
})

type ProfileEditValues = z.infer<typeof profileEditSchema>
type Area = { id: string; title: string; description: string | null; coverImageUrl?: string | null; position?: number }
type AddressData = { public?: boolean | null; zipCode?: string | null; street?: string | null; number?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null }
type ProfileData = {
  publicName?: string | null
  aboutDescription?: string | null
  publicEmail?: string | null
  publicPhone?: string | null
  whatsapp?: string | null
  calendlyUrl?: string | null
  avatarUrl?: string | null
  coverUrl?: string | null
  primaryColor?: string | null
  textColor?: string | null
  slug?: string | null
}

// Queries
async function fetchProfile() {
  const res = await fetch("/api/profile", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar perfil")
  return res.json() as Promise<{ profile: ProfileData | null; areas: Area[]; address?: AddressData }>
}
async function validateSlug(slug: string) {
  const res = await fetch("/api/profile/validate-slug", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) })
  if (!res.ok) throw new Error("Slug inválido")
  return res.json() as Promise<{ valid: boolean; slug: string }>
}
async function updateProfile(data: FormData) {
  const res = await fetch("/api/profile", { method: "PATCH", body: data })
  if (!res.ok) throw new Error("Falha ao salvar perfil")
  return res.json()
}
async function createArea() {
  const res = await fetch("/api/activity-areas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Nova área", description: "Descrição da área." }) })
  if (!res.ok) throw new Error("Falha ao criar área")
  return res.json() as Promise<{ area: Area }>
}
async function patchArea(area: Area) {
  const res = await fetch("/api/activity-areas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(area) })
  if (!res.ok) throw new Error("Falha ao salvar área")
  return res.json() as Promise<{ area: Area }>
}
async function reorderAreas(order: { id: string; position: number }[]) {
  const res = await fetch("/api/activity-areas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  if (!res.ok) throw new Error("Falha ao reordenar áreas")
  return res.json() as Promise<{ ok: boolean }>
}
async function deleteArea(id: string) {
  const res = await fetch(`/api/activity-areas?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir área")
  return res.json() as Promise<{ ok: boolean }>
}
async function aiGenerateDescription(title: string) {
  const res = await fetch("/api/activity-areas/generate-description", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) })
  if (!res.ok) throw new Error("Falha ao gerar descrição")
  return res.json() as Promise<{ description: string }>
}

export default function EditProfileForm() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { publicName: "", aboutDescription: "", publicEmail: "", publicPhone: "", whatsapp: "", calendlyUrl: "", addressPublic: true, zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  })
  const { register, handleSubmit, formState: { errors }, reset, control } = form

  const [areas, setAreas] = useState<Area[]>([])
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [areaCoverFile, setAreaCoverFile] = useState<File | null>(null)
  const [areaCoverPreview, setAreaCoverPreview] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState<boolean>(false)
  const [primaryColor, setPrimaryColor] = useState<string>("#8B0000")
  const [textColor, setTextColor] = useState<string>("#FFFFFF")
  const [slugInput, setSlugInput] = useState("")
  const [slugValid, setSlugValid] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [initialSlug, setInitialSlug] = useState("")
  const [areaSaving, setAreaSaving] = useState(false)
  const [removeAreaCover, setRemoveAreaCover] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Area | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!data) return
    const p = data.profile ?? {}
    const a = data.address ?? {}
    reset({
      publicName: p.publicName ?? "",
      aboutDescription: p.aboutDescription ?? "",
      publicEmail: p.publicEmail ?? "",
      publicPhone: p.publicPhone ?? "",
      whatsapp: p.whatsapp ?? "",
      calendlyUrl: p.calendlyUrl ?? "",
      addressPublic: a.public ?? true,
      zipCode: a.zipCode ?? "",
      street: a.street ?? "",
      number: a.number ?? "",
      complement: a.complement ?? "",
      neighborhood: a.neighborhood ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
    })
    if (p.avatarUrl) setPreviewUrl(p.avatarUrl as string)
    setRemoveAvatar(false)
    if (p.coverUrl) setCoverPreviewUrl(p.coverUrl as string)
    setRemoveCover(false)
    setPrimaryColor((p.primaryColor as string) ?? "#8B0000")
    setTextColor((p.textColor as string) ?? "#FFFFFF")
    const currentSlug = (p.slug as string) ?? ""
    setSlugInput(currentSlug)
    setInitialSlug(currentSlug)
    setAreas(data.areas ?? [])
  }, [data, reset])

  const saveProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })
  const createAreaMutation = useMutation({
    mutationFn: createArea,
    onSuccess: async (res) => {
      setAreas((prev) => [...prev, res.area])
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const patchAreaMutation = useMutation({
    mutationFn: patchArea,
    onSuccess: async (res) => {
      setAreas((prev) => prev.map((a) => (a.id === res.area.id ? res.area : a)))
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const reorderMutation = useMutation({
    mutationFn: reorderAreas,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const deleteMutation = useMutation({
    mutationFn: deleteArea,
    onSuccess: async () => {
      setAreas((prev) => prev.filter((a) => a.id !== (deleteConfirm?.id ?? "")))
      setDeleteConfirm(null)
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const aiMutation = useMutation({ mutationFn: aiGenerateDescription })

  const draftMdRef = useRef<string>("")
  const editingAreaHtml = useMemo(() => {
    const md = editingArea?.description ?? draftMdRef.current ?? ""
    return md ? (marked.parse(md) as string) : ""
  }, [editingArea?.description])
  const turndown = useMemo(() => {
    const t = new TurndownService({ headingStyle: "atx", emDelimiter: "*" })
    t.addRule("emptyParagraph", { filter: (node: Element) => node.nodeName === "P" && !String((node.textContent || "")).trim(), replacement: () => "\n\n" })
    t.addRule("paragraph", { filter: ["p"], replacement: (content: string) => `${content}\n\n` })
    t.addRule("lineBreak", { filter: ["br"], replacement: () => "  \n" })
    t.addRule("underline", { filter: ["u"], replacement: (content: string) => `<u>${content}</u>` })
    return t
  }, [])
  const editor = useEditor({
    extensions: [StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }), Underline],
    content: editingAreaHtml,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[200px] max-h-[400px] overflow-auto focus:outline-none" } },
    onUpdate: ({ editor }: { editor: { getHTML: () => string } }) => { const html = editor.getHTML(); const md = turndown.turndown(html); draftMdRef.current = md },
  })
  useEffect(() => { if (editor && editingArea) { editor.commands.setContent(editingAreaHtml, { emitUpdate: false }); draftMdRef.current = editingArea.description ?? "" } }, [editor, editingArea, editingAreaHtml])

  async function onSubmit(values: ProfileEditValues) {
    if (slugInput !== (initialSlug || "") && slugValid !== true) { alert("O slug informado não é válido ou não foi verificado. Por favor, verifique o slug antes de salvar."); return }
    const fd = new FormData()
    fd.set("publicName", values.publicName)
    fd.set("aboutDescription", values.aboutDescription ?? "")
    if (values.publicEmail) fd.set("publicEmail", values.publicEmail)
    if (values.publicPhone) fd.set("publicPhone", values.publicPhone)
    if (values.whatsapp) fd.set("whatsapp", values.whatsapp)
    if (values.calendlyUrl) fd.set("calendlyUrl", values.calendlyUrl)
    if (values.addressPublic !== undefined) fd.set("addressPublic", String(values.addressPublic))
    if (values.zipCode) fd.set("zipCode", values.zipCode)
    if (values.street) fd.set("street", values.street)
    if (values.number) fd.set("number", values.number)
    if (values.complement) fd.set("complement", values.complement)
    if (values.neighborhood) fd.set("neighborhood", values.neighborhood)
    if (values.city) fd.set("city", values.city)
    if (values.state) fd.set("state", values.state)
    fd.set("primaryColor", primaryColor)
    fd.set("textColor", textColor)
    if (slugInput) fd.set("slug", slugInput)
    if (removeAvatar) {
      fd.set("removeAvatar", "true")
    }
    if (photoFile) fd.set("photo", photoFile)
    if (removeCover) {
      fd.set("removeCover", "true")
    }
    if (coverFile) fd.set("cover", coverFile)
    await saveProfileMutation.mutateAsync(fd)
    // Garantia extra: invalida e refaz o fetch do Preview
    await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
    await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    showToast("Salvo com sucesso!")
  }

  async function onCheckSlug() {
    setSlugChecking(true)
    try {
      const res = await validateSlug(slugInput)
      setSlugValid(Boolean(res.valid))
      if (!res.valid) alert("Slug já existe. Escolha outro.")
    } finally {
      setSlugChecking(false)
    }
  }

  if (isLoading) return <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">Carregando…</div>

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
<h1 className="text-2xl font-semibold">Editar informações</h1>
        {/* Foto de Perfil */}
        <div className="w-full">
          <Label className="mb-2 block">Foto de perfil</Label>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative h-32 w-32 mb-4">
              <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-zinc-800">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Pré-visualização do avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-400">
                    <Camera className="h-5 w-5" />
                  </div>
                )}
              </div>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPreviewUrl(null); setRemoveAvatar(true) }}
                  className="absolute -right-2 -top-2 z-50 rounded-full border border-zinc-600 bg-zinc-900/90 p-1.5 text-zinc-100 shadow-lg backdrop-blur-sm hover:bg-zinc-800"
                  aria-label="Remover foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-800">
                <Upload className="w-4 h-4" />
                <span>Enviar foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setRemoveAvatar(false); setPhotoFile(f); const url = URL.createObjectURL(f); setPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url }) }} />
              </label>
            </div>
          </div>
        </div>
        {/* Link público */}
        <div>
          <Label htmlFor="slug" className="mb-2 block">Link público</Label>
          <div className="flex items-center gap-2">
            <div className="flex w-full max-w-xl items-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
              <span className="pl-3 pr-1 py-2 text-sm text-zinc-400 whitespace-nowrap select-none">https://advlink.site/adv/</span>
              <input
                id="slug"
                value={slugInput}
                onChange={(e) => { setSlugInput(e.target.value); setSlugValid(null) }}
                placeholder="seu-slug"
                className="flex-1 bg-transparent text-sm text-zinc-100 outline-none px-0 py-2"
              />
            </div>
            <Button type="button" variant="secondary" onClick={onCheckSlug} disabled={slugChecking || slugInput.trim().length === 0 || slugInput === initialSlug}>
              {slugChecking ? "Verificando..." : "Verificar"}
            </Button>
          </div>
          {slugValid === false && (<p className="mt-1 text-sm text-red-400">Este slug já existe. Escolha outro.</p>)}
          {slugValid === true && (<p className="mt-1 text-sm text-green-400">Slug disponível!</p>)}
        </div>

        {/* Capa */}
        <div className="flex flex-col gap-2 mt-4">
          <Label className="mb-2 block">Capa da página</Label>
          <div className="flex flex-col gap-4">
            <div className="relative h-44 w-full overflow-hidden rounded-md ring-2 ring-zinc-800">
              {coverPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreviewUrl} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-400 text-xs text-center px-1">Capa</div>
              )}
              {coverPreviewUrl && (
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreviewUrl(null); setRemoveCover(true) }}
                  className="absolute right-2 top-2 z-50 rounded-full border border-zinc-600 bg-zinc-900/90 p-1.5 text-zinc-100 shadow-lg backdrop-blur-sm hover:bg-zinc-800"
                  aria-label="Remover capa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-800">
                <Upload className="w-4 h-4" />
                <span>Enviar capa</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setRemoveCover(false); setCoverFile(f); const url = URL.createObjectURL(f); setCoverPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url }) }} />
              </label>
            </div>
          </div>
        </div>

        {/* Campos básicos */}
        <div className="flex flex-col gap-2 mt-12">
          <Label htmlFor="publicName" className="mb-2 block">Nome de exibição</Label>
          <Input id="publicName" {...register("publicName")} />
          {errors.publicName && <p className="mt-1 text-sm text-red-400">{errors.publicName.message}</p>}
        </div>
        <div>
          <Label htmlFor="aboutDescription" className="mb-2 block">Sobre mim</Label>
          <Textarea id="aboutDescription" rows={5} {...register("aboutDescription")} />
          {errors.aboutDescription && <p className="mt-1 text-sm text-red-400">{errors.aboutDescription.message as string}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="publicEmail" className="mb-2 block">E-mail para contato</Label>
            <Input id="publicEmail" type="email" {...register("publicEmail")} />
            {errors.publicEmail && <p className="mt-1 text-sm text-red-400">{errors.publicEmail.message}</p>}
          </div>
          <div>
            <Label htmlFor="publicPhone" className="mb-2 block">Telefone</Label>
            <Input id="publicPhone" {...register("publicPhone")} />
          </div>
        </div>
        <div>
          <Label htmlFor="calendlyUrl" className="mb-2 block">Calendly URL</Label>
          <Input id="calendlyUrl" placeholder="https://calendly.com/seu-usuario" {...register("calendlyUrl")} />
          {errors.calendlyUrl && <p className="mt-1 text-sm text-red-400">{errors.calendlyUrl.message}</p>}
        </div>

        {/* Endereço */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <h3 className="text-base font-semibold">Endereço</h3>
          <div className="flex items-center gap-3">
            <Label htmlFor="addressPublic">Mostrar Endereço?</Label>
            <Controller
              control={control}
              name="addressPublic"
              render={({ field }: { field: { value?: boolean; onChange: (v: boolean) => void } }) => (
                <Switch id="addressPublic" checked={!!field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="zipCode" className="mb-1 block">CEP</Label>
              <Input id="zipCode" placeholder="00000-000" {...register("zipCode", { onChange: (e) => { const v = e.target.value.replace(/\D/g, '').slice(0,8); const masked = v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v; e.target.value = masked } })} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="street" className="mb-1 block">Endereço</Label>
              <Input id="street" {...register("street")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="number" className="mb-1 block">Número</Label>
              <Input id="number" {...register("number")} />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="complement" className="mb-1 block">Complemento</Label>
              <Input id="complement" {...register("complement")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="neighborhood" className="mb-1 block">Bairro</Label>
              <Input id="neighborhood" {...register("neighborhood")} />
            </div>
            <div>
              <Label htmlFor="city" className="mb-1 block">Cidade</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div>
              <Label htmlFor="state" className="mb-1 block">Estado</Label>
              <Input id="state" placeholder="UF" maxLength={2} {...register("state")} />
            </div>
          </div>
        </div>

        {/* Cores */}
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="primaryColor" className="mb-2 block">Cor Principal</Label>
            <input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-20 w-20 border border-zinc-800 bg-zinc-900"/>
          </div>
          <div>
            <Label htmlFor="textColor" className="mb-2 block">Cor do Texto</Label>
            <input id="textColor" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-20 w-20 border border-zinc-800 bg-zinc-900"/>
          </div>
        </div>



        {/* WhatsApp */}
        <div>
          <Label htmlFor="whatsapp" className="mb-2 block">WhatsApp</Label>
          <Input id="whatsapp" {...register("whatsapp")} />
        </div>

              {/* Lista de áreas */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Áreas de atuação</h2>
          <Button type="button" variant="secondary" className="gap-2" onClick={() => createAreaMutation.mutate()}>
            <Plus className="w-4 h-4" /> Nova área
          </Button>
        </div>
        <div className="space-y-2">
          {areas.map((a, idx) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
            >
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-xs text-zinc-400 w-6 text-right hidden md:inline-block">{idx + 1}</span>
                <span className="text-sm truncate flex-1 min-w-0">{a.title}</span>
              </div>
              <div className="flex items-center gap-1 w-full md:w-auto justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={idx === 0 || reorderMutation.isPending}
                  onClick={async () => {
                    const next = [...areas]
                    const tmp = next[idx - 1]
                    next[idx - 1] = next[idx]
                    next[idx] = tmp
                    setAreas(next)
                    const order = next.map((it, i) => ({ id: it.id, position: i + 1 }))
                    try { await reorderMutation.mutateAsync(order) } catch { showToast("Falha ao reordenar") }
                  }}
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={idx === areas.length - 1 || reorderMutation.isPending}
                  onClick={async () => {
                    const next = [...areas]
                    const tmp = next[idx + 1]
                    next[idx + 1] = next[idx]
                    next[idx] = tmp
                    setAreas(next)
                    const order = next.map((it, i) => ({ id: it.id, position: i + 1 }))
                    try { await reorderMutation.mutateAsync(order) } catch { showToast("Falha ao reordenar") }
                  }}
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                {/* Edit button: icon-only on mobile, with text on md+ */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => { setEditingArea(a); setRemoveAreaCover(false) }}
                  aria-label="Editar área"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden md:inline">Editar</span>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => setDeleteConfirm(a)}
                  aria-label="Excluir área"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

        <div className="flex justify-end mt-12">
          <Button type="submit" disabled={saveProfileMutation.isPending} className="gap-2 w-full cursor-pointer">
            <Save className="w-4 h-4" />
            {saveProfileMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>



      <Dialog open={!!editingArea} onOpenChange={(v) => !v && (setEditingArea(null), setRemoveAreaCover(false))}>
        <DialogContent className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-300">Editar área</DialogTitle>
          </DialogHeader>
          {editingArea && (
            <div className="space-y-3 text-zinc-300">
              <div>
                <Label className="mb-2 block">Título</Label>
                <Input value={editingArea.title} onChange={(e) => setEditingArea({ ...editingArea, title: e.target.value })} />
              </div>
              {/* Capa da área */}
              <div className="flex flex-col gap-2 mt-4">
                <Label className="mb-2 block">Capa da área</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-40 w-40 overflow-hidden rounded-md ring-2 ring-zinc-800">
                    {(areaCoverPreview || (editingArea.coverImageUrl && !removeAreaCover)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={areaCoverPreview || (editingArea.coverImageUrl as string)} alt="Capa da área" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-zinc-800 text-xs text-zinc-400">Capa</div>
                    )}
                    {(areaCoverPreview || (editingArea.coverImageUrl && !removeAreaCover)) && (
                      <button
                        type="button"
                        className="absolute right-1 top-1 z-10 rounded-full border border-zinc-600 bg-zinc-900/80 p-1 text-zinc-200 shadow-md backdrop-blur hover:bg-zinc-800"
                        onClick={() => { setAreaCoverFile(null); setAreaCoverPreview(null); setRemoveAreaCover(true) }}
                        aria-label="Remover capa"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-800">
                    <Upload className="h-4 w-4" />
                    <span>Enviar capa</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        setAreaCoverFile(f)
                        setRemoveAreaCover(false)
                        const url = URL.createObjectURL(f)
                        setAreaCoverPreview((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <div className="mb-2 mt-8 flex items-center justify-between">
                  <Label className="block">Descrição</Label>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!editingArea?.title || aiMutation.isPending}
                    className="cursor-pointer"
                    onClick={async () => {
                      if (!editingArea) return
                      try {
                        const { description } = await aiMutation.mutateAsync(editingArea.title)
                        // Preenche editor com o markdown gerado
                        draftMdRef.current = description
                        editor?.commands.setContent(marked.parse(description) as string, { emitUpdate: false })
                      } catch {
                        alert("Falha ao gerar descrição com IA")
                      }
                    }}
                  >
                    <WandSparkles className="w-4 h-4" />
                    {aiMutation.isPending ? "Gerando com IA..." : "Gerar com IA"}
                  </Button>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  {editor && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant={editor.isActive('bold') ? 'default' : 'secondary'} onClick={() => editor.chain().focus().toggleBold().run()}>Negrito</Button>
                    </div>
                  )}
                  {aiMutation.isPending ? (
                    <div className="py-16 text-center text-sm text-zinc-400">Gerando descrição com IA...</div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                    <EditorContent editor={editor} />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!editingArea || areaSaving) return
                    try {
                      setAreaSaving(true)
                      if (areaCoverFile) {
                        const fd = new FormData()
                        fd.set("id", editingArea.id)
                        fd.set("title", editingArea.title)
                        fd.set("description", draftMdRef.current)
                        fd.set("cover", areaCoverFile)
                        const res = await fetch("/api/activity-areas", { method: "PATCH", body: fd })
                        if (!res.ok) { alert("Falha ao salvar área"); return }
                        const data = await res.json()
                        setAreas((prev) => prev.map((a) => (a.id === data.area.id ? data.area : a)))
                        await qc.invalidateQueries({ queryKey: ["profile"] })
                        await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                        setAreaCoverFile(null)
                        setAreaCoverPreview(null)
                        setRemoveAreaCover(false)
                        setEditingArea(null)
                      } else {
                        // Se não há arquivo novo, verifique se deve remover a imagem
                        const toSave = { 
                          ...editingArea, 
                          description: draftMdRef.current,
                          coverImageUrl: removeAreaCover ? null : editingArea.coverImageUrl
                        }
                        await patchAreaMutation.mutateAsync(toSave)
                        await qc.invalidateQueries({ queryKey: ["profile"] })
                        await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                        setEditingArea(null)
                        setRemoveAreaCover(false)
                      }
                    } finally {
                      setAreaSaving(false)
                    }
                  }}
                  className="gap-2 cursor-pointer"
                  disabled={areaSaving || patchAreaMutation.isPending}
                  aria-busy={areaSaving || patchAreaMutation.isPending}
                >
                  <Save className="w-4 h-4" /> {areaSaving || patchAreaMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button variant="ghost" className="gap-2 cursor-pointer" onClick={() => setEditingArea(null)}>
                  <X className="w-4 h-4" /> Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão de área */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir área</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <div className="space-y-3 text-zinc-300">
              <p>Tem certeza que deseja excluir a área "{deleteConfirm.title}"? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await deleteMutation.mutateAsync(deleteConfirm.id)
                      showToast("Área excluída")
                    } catch {
                      showToast("Falha ao excluir área")
                    }
                  }}
                  className="cursor-pointer"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast global via ToastProvider */}
    </>
  )
}


