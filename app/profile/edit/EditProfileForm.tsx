"use client"

import { useEffect, useRef, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Pencil, Plus, Save, Trash2, Upload, WandSparkles, X, ArrowDown, ArrowUp, ExternalLink, Link as LinkIcon } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import "@mdxeditor/editor/style.css"
import {
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  HighlightToggle,
  StrikeThroughSupSubToggles,
  ListsToggle,
  UndoRedo,
  BlockTypeSelect,
  Separator,
  headingsPlugin,
  listsPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin
} from "@mdxeditor/editor"
import dynamic from "next/dynamic"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const MDXEditor = dynamic(() => import("@mdxeditor/editor").then(m => m.MDXEditor), { ssr: false })

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
  // SEO
  metaTitle: z.string().max(80, "Máximo de 80 caracteres.").optional().or(z.literal("").transform(() => undefined)),
  metaDescription: z.string().max(160, "Máximo de 160 caracteres.").optional().or(z.literal("").transform(() => undefined)),
  keywords: z.string().optional().or(z.literal("").transform(() => undefined)),
  gtmContainerId: z
    .string()
    .regex(/^GTM-[A-Z0-9]+$/i, "Informe um ID válido, ex: GTM-XXXXXXX")
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
type LinkItem = { id: string; title: string; description: string | null; url: string; coverImageUrl?: string | null; position?: number }
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
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string | null
  gtmContainerId?: string | null
  theme?: string | null
}

// Queries
async function fetchProfile() {
  const res = await fetch("/api/profile", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar perfil")
  return res.json() as Promise<{ profile: ProfileData | null; areas: Area[]; address?: AddressData; links: LinkItem[] }>
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

// Links API
async function createLink() {
  const res = await fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Novo link", description: "", url: "https://" }) })
  if (!res.ok) throw new Error("Falha ao criar link")
  return res.json() as Promise<{ link: { id: string; title: string; description: string | null; url: string; coverImageUrl?: string | null; position?: number } }>
}
async function patchLink(link: LinkItem) {
  const res = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link) })
  if (!res.ok) throw new Error("Falha ao salvar link")
  return res.json() as Promise<{ link: LinkItem }>
}
async function reorderLinks(order: { id: string; position: number }[]) {
  const res = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  if (!res.ok) throw new Error("Falha ao reordenar links")
  return res.json() as Promise<{ ok: boolean }>
}
async function deleteLink(id: string) {
  const res = await fetch(`/api/links?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir link")
  return res.json() as Promise<{ ok: boolean }>
}

export default function EditProfileForm() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      publicName: "",
      aboutDescription: "",
      publicEmail: "",
      publicPhone: "",
      whatsapp: "",
      calendlyUrl: "",
      metaTitle: "",
      metaDescription: "",
      keywords: "",
      gtmContainerId: "",
      addressPublic: true,
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    },
  })
  const { register, handleSubmit, formState: { errors }, reset, control } = form

  const [areas, setAreas] = useState<Area[]>([])
  const [links, setLinks] = useState<LinkItem[]>([])
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [areaCoverFile, setAreaCoverFile] = useState<File | null>(null)
  const [areaCoverPreview, setAreaCoverPreview] = useState<string | null>(null)
  const [linkCoverFile, setLinkCoverFile] = useState<File | null>(null)
  const [linkCoverPreview, setLinkCoverPreview] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState<boolean>(false)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [removeCover, setRemoveCover] = useState<boolean>(false)
  const [areaCoverGenerating, setAreaCoverGenerating] = useState<boolean>(false)
  const [primaryColor, setPrimaryColor] = useState<string>("#8B0000")
  const [textColor, setTextColor] = useState<string>("#FFFFFF")
  const [theme, setTheme] = useState<"modern" | "classic">("modern")
  const [slugInput, setSlugInput] = useState("")
  const [slugValid, setSlugValid] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [initialSlug, setInitialSlug] = useState("")
  const [areaSaving, setAreaSaving] = useState(false)
  const [removeAreaCover, setRemoveAreaCover] = useState(false)
  const [linkSaving, setLinkSaving] = useState(false)
  const [removeLinkCover, setRemoveLinkCover] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Area | null>(null)
  const [deleteLinkConfirm, setDeleteLinkConfirm] = useState<LinkItem | null>(null)
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
      metaTitle: p.metaTitle ?? "",
      metaDescription: p.metaDescription ?? "",
      keywords: p.keywords ?? "",
      gtmContainerId: p.gtmContainerId ?? "",
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
    setTheme(((p.theme as string) === "classic" ? "classic" : "modern"))
    const currentSlug = (p.slug as string) ?? ""
    setSlugInput(currentSlug)
    setInitialSlug(currentSlug)
    setAreas(data.areas ?? [])
    setLinks((data as unknown as { links?: LinkItem[] }).links ?? [])
    // Carrega "Sobre mim" no MDX com quebras preservadas (decodificando entidades)
    const rawAbout = p.aboutDescription ?? ""
    const initialAbout = decodeEntities(rawAbout)
    setAboutMarkdown(initialAbout)
  }, [data, reset])

  const saveProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })
  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: "modern" | "classic") => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      })
      if (!res.ok) throw new Error("Falha ao salvar tema")
      return res.json()
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
      showToast("Tema atualizado!")
    }
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

  // Links mutations
  const createLinkMutation = useMutation({
    mutationFn: createLink,
    onSuccess: async (res) => {
      setLinks((prev) => [...prev, res.link])
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const patchLinkMutation = useMutation({
    mutationFn: patchLink,
    onSuccess: async (res) => {
      setLinks((prev) => prev.map((l) => (l.id === res.link.id ? res.link : l)))
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const reorderLinksMutation = useMutation({
    mutationFn: reorderLinks,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const deleteLinkMutation = useMutation({
    mutationFn: deleteLink,
    onSuccess: async () => {
      setLinks((prev) => prev.filter((l) => l.id !== (deleteLinkConfirm?.id ?? "")))
      setDeleteLinkConfirm(null)
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })

  // ------- QUEBRAS DE LINHA: helpers -------
  const draftMdRef = useRef<string>("")
  const [editorMarkdown, setEditorMarkdown] = useState<string>("")
  const [aboutMarkdown, setAboutMarkdown] = useState<string>("")

  // Decodifica entidades HTML vindas do banco (ex.: &lt;br /&gt; -> <br />)
  function decodeEntities(s: string) {
    if (typeof window === "undefined") {
      return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    }
    const ta = document.createElement("textarea")
    ta.innerHTML = s
    return ta.value
  }

  // Preserva espaço vertical extra transformando quebras além de 2 \n em <br />
  function preserveVerticalSpace(md: string) {
    return md.replace(/\n{3,}/g, (block) => {
      const extra = block.length - 2
      return "\n\n" + Array.from({ length: extra }).map(() => "<br />").join("\n")
    })
  }

  useEffect(() => {
    if (editingArea) {
      const raw = editingArea.description ?? ""
      const initial = decodeEntities(raw) // transforma &lt;br/&gt; em <br />
      draftMdRef.current = initial
      setEditorMarkdown(initial)
    }
  }, [editingArea])

  useEffect(() => {
    if (editingLink) {
      setRemoveLinkCover(false)
      setLinkCoverPreview(null)
      setLinkCoverFile(null)
    }
  }, [editingLink])

  // ------------------------------------------

  async function onSubmit(values: ProfileEditValues) {
    if (slugInput !== (initialSlug || "") && slugValid !== true) {
      alert("O slug informado não é válido ou não foi verificado. Por favor, verifique o slug antes de salvar.")
      return
    }
    const fd = new FormData()
    fd.set("publicName", values.publicName)
    // Usa o MDX "Sobre mim" (aboutMarkdown) com preservação de quebras extras
    fd.set("aboutDescription", preserveVerticalSpace(aboutMarkdown || ""))
    if (values.publicEmail) fd.set("publicEmail", values.publicEmail)
    if (values.publicPhone) fd.set("publicPhone", values.publicPhone)
    if (values.whatsapp) fd.set("whatsapp", values.whatsapp)
    if (values.calendlyUrl) fd.set("calendlyUrl", values.calendlyUrl)
    if (values.metaTitle) fd.set("metaTitle", values.metaTitle)
    if (values.metaDescription) fd.set("metaDescription", values.metaDescription)
    if (values.keywords) fd.set("keywords", values.keywords)
    if (values.gtmContainerId) fd.set("gtmContainerId", values.gtmContainerId)
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 pb-6">
        {/* Sticky top bar with actions */}
        <div className="hidden md:flex sticky top-0 -mx-6 px-6 pb-3 z-10 bg-zinc-900/70 backdrop-blur-md border-b border-zinc-800">
          <div className="flex items-center justify-between gap-3 p-3 rounded-t-xl bg-cover mt-2">
            <h1 className="text-2xl font-semibold">Editar informações</h1>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => {
                const targetSlug = (slugInput || initialSlug || '').trim()
                const url = targetSlug ? `/adv/${encodeURIComponent(targetSlug)}` : '/profile/edit'
                window.open(url, '_blank')
              }}>
                <ExternalLink className="w-4 h-4" />
                Visualizar
              </Button>
              <Button type="submit" disabled={saveProfileMutation.isPending} className="gap-2 cursor-pointer">
                <Save className="w-4 h-4" />
                {saveProfileMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Floating save button (mobile only) */}
        <Button
          type="submit"
          disabled={saveProfileMutation.isPending}
          aria-label="Salvar"
          size="icon"
          className="md:hidden fixed bottom-4 right-4 z-20 shadow-lg h-12 w-12 rounded-full backdrop-blur-md border border-zinc-800"
        >
          <Save className="w-10 h-10" />
        </Button>

        {/* Visual */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Visual</h2>
        </div>

        {/* Tema */}
        <div className="mt-8">
          <Label className="mb-2 text-2xl block font-bold">Tema</Label>
          <div className="flex gap-6 items-center mb-8">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="w-5 h-5"
                name="theme"
                value="classic"
                checked={theme === "classic"}
                onChange={async () => {
                  setTheme("classic")
                  try { await updateThemeMutation.mutateAsync("classic") } catch {}
                }}
              />
              <span>Clássico</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="w-5 h-5"
                name="theme"
                value="modern"
                checked={theme === "modern"}
                onChange={async () => {
                  setTheme("modern")
                  try { await updateThemeMutation.mutateAsync("modern") } catch {}
                }}
              />
              <span>Moderno</span>
            </label>
          </div>
        </div>

        {/* Cores */}
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="primaryColor" className="mb-2 block font-bold">Cor Principal</Label>
            <input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-20 w-20 border border-zinc-800 bg-zinc-900"/>
          </div>
          <div>
            <Label htmlFor="textColor" className="mb-2 block font-bold">Cor do Texto</Label>
            <input id="textColor" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-20 w-20 border border-zinc-800 bg-zinc-900"/>
          </div>
        </div>


        {/* Foto de Perfil */}
        <div className="mt-8 w-full">
          <Label className="text- center mb-2 block font-bold">Foto de perfil</Label>
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setRemoveAvatar(false)
                  setPhotoFile(f)
                  const url = URL.createObjectURL(f)
                  setPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                }} />
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
          <Label className="mb-2 block font-bold">Capa da página</Label>
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setRemoveCover(false)
                  setCoverFile(f)
                  const url = URL.createObjectURL(f)
                  setCoverPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                }} />
              </label>
            </div>
          </div>
        </div>

        {/* Perfil */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Perfil</h2>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicName" className="mb-2 block font-bold">Nome de exibição <span className="text-red-500" aria-hidden>*</span></Label>
          <Input id="publicName" {...register("publicName")} />
          {errors.publicName && <p className="mt-1 text-sm text-red-400">{errors.publicName.message}</p>}
        </div>
        <div>
          <Label htmlFor="aboutDescription" className="mb-2 block font-bold">Sobre mim</Label>
          <div className="relative overflow-visible z-[1000] border border-zinc-800 bg-zinc-900/50 rounded-md">
            <MDXEditor
              className="mdxeditor min-h-[300px] max-h-[65vh] overflow-visible"
              contentEditableClassName="min-h-[310px] p-4 cursor-text !text-zinc-50 whitespace-pre-wrap"
              markdown={aboutMarkdown}
              onChange={(md: string) => setAboutMarkdown(md)}
              plugins={[
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <Separator />
                      <BoldItalicUnderlineToggles />
                    </>
                  )
                }),
                headingsPlugin(),
                listsPlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin({ remarkBreaks: true })
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="publicEmail" className="mb-2 block font-bold">E-mail para contato</Label>
            <Input id="publicEmail" type="email" {...register("publicEmail")} />
            {errors.publicEmail && <p className="mt-1 text-sm text-red-400">{errors.publicEmail.message}</p>}
          </div>
          <div>
            <Label htmlFor="publicPhone" className="mb-2 block font-bold">Telefone</Label>
            <Input id="publicPhone" {...register("publicPhone")} />
          </div>
          {/* WhatsApp */}
          <div>
            <Label htmlFor="whatsapp" className="mb-2 block">WhatsApp</Label>
            <Input id="whatsapp" {...register("whatsapp")} />
          </div>
        </div>

        <div>
          <Label htmlFor="calendlyUrl" className="mb-2 block font-bold">Calendly URL</Label>
          <Input id="calendlyUrl" placeholder="https://calendly.com/seu-usuario" {...register("calendlyUrl")} />
          {errors.calendlyUrl && <p className="mt-1 text-sm text-red-400">{errors.calendlyUrl.message}</p>}
        </div>

        {/* Endereço */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <h3 className="text-base font-semibold">Endereço</h3>
          <div className="flex items-center gap-3">
            <Label htmlFor="addressPublic" className="font-bold">Mostrar Endereço?</Label>
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
              <Label htmlFor="zipCode" className="mb-2 block font-bold">CEP</Label>
              <Input
                id="zipCode"
                placeholder="00000-000"
                {...register("zipCode", {
                  onChange: (e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                    const masked = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v
                    e.target.value = masked
                  }
                })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="street" className="mb-2 block font-bold">Endereço</Label>
              <Input id="street" {...register("street")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="number" className="mb-2 block font-bold">Número</Label>
              <Input id="number" {...register("number")} />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="complement" className="mb-2 block font-bold">Complemento</Label>
              <Input id="complement" {...register("complement")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="neighborhood" className="mb-2 block font-bold">Bairro</Label>
              <Input id="neighborhood" {...register("neighborhood")} />
            </div>
            <div>
              <Label htmlFor="city" className="mb-2 block font-bold">Cidade</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div>
              <Label htmlFor="state" className="mb-2 block font-bold">Estado</Label>
              <Input id="state" placeholder="UF" maxLength={2} {...register("state")} />
            </div>
          </div>
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

        {/* Links */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Links</h2>
            <Button type="button" variant="secondary" className="gap-2" onClick={() => createLinkMutation.mutate()}>
              <Plus className="w-4 h-4" /> Novo link
            </Button>
          </div>
          <div className="space-y-2">
            {links.map((l, idx) => (
              <div
                key={l.id}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="text-xs text-zinc-400 w-6 text-right hidden md:inline-block">{idx + 1}</span>
                  <span className="text-sm truncate flex-1 min-w-0">{l.title} <span className="text-xs text-zinc-500">({l.url})</span></span>
                </div>
                <div className="flex items-center gap-1 w-full md:w-auto justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={idx === 0 || reorderLinksMutation.isPending}
                    onClick={async () => {
                      const next = [...links]
                      const tmp = next[idx - 1]
                      next[idx - 1] = next[idx]
                      next[idx] = tmp
                      setLinks(next)
                      const order = next.map((it, i) => ({ id: it.id, position: i + 1 }))
                      try { await reorderLinksMutation.mutateAsync(order) } catch { showToast("Falha ao reordenar links") }
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
                    disabled={idx === links.length - 1 || reorderLinksMutation.isPending}
                    onClick={async () => {
                      const next = [...links]
                      const tmp = next[idx + 1]
                      next[idx + 1] = next[idx]
                      next[idx] = tmp
                      setLinks(next)
                      const order = next.map((it, i) => ({ id: it.id, position: i + 1 }))
                      try { await reorderLinksMutation.mutateAsync(order) } catch { showToast("Falha ao reordenar links") }
                    }}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => { setEditingLink(l); setRemoveLinkCover(false) }}
                    aria-label="Editar link"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden md:inline">Editar</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => setDeleteLinkConfirm(l)}
                    aria-label="Excluir link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">SEO</h2>
        </div>
        <div>
          <Label htmlFor="metaTitle" className="mb-2 block font-bold">Meta Title</Label>
          <Input id="metaTitle" maxLength={80} placeholder="Título curto e persuasivo (até 80 caracteres)" {...register("metaTitle")} />
        </div>
        <div>
          <Label htmlFor="metaDescription" className="mb-2 block font-bold">Meta Description</Label>
          <Textarea id="metaDescription" rows={3} placeholder="Descrição curta e persuasiva" {...register("metaDescription")} />
        </div>
        <div>
          <Label htmlFor="keywords" className="mb-2 block font-bold">Palavras-chave</Label>
          <Input id="keywords" placeholder="ex.: advocacia civil, direito do consumidor" {...register("keywords")} />
          <p className="mt-1 text-xs text-zinc-400">Separe por vírgulas.</p>
        </div>
        <div>
          <Label htmlFor="gtmContainerId" className="mb-2 block font-bold">Google Tag Manager</Label>
          <Input id="gtmContainerId" placeholder="GTM-XXXXXXX" {...register("gtmContainerId")} />
        </div>

        <div className="flex justify-end mt-12">
          <Button type="submit" disabled={saveProfileMutation.isPending} className="gap-2 w-full cursor-pointer">
            <Save className="w-4 h-4" />
            {saveProfileMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>

      <Dialog open={!!editingArea} onOpenChange={(v) => !v && (setEditingArea(null), setRemoveAreaCover(false), setAreaCoverPreview(null), setAreaCoverGenerating(false))}>
        <DialogContent className="overflow-visible w-full max-w-6xl">
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
                    {areaCoverGenerating ? (
                      <div className="grid h-full w-full place-items-center bg-zinc-800 text-xs text-zinc-300 text-center px-2">Estamos gerando sua capa com iA…</div>
                    ) : (areaCoverPreview || (editingArea.coverImageUrl && !removeAreaCover)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={areaCoverPreview || (editingArea.coverImageUrl as string)} alt="Capa da área" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-zinc-800 text-xs text-zinc-400">Capa</div>
                    )}
                    {!areaCoverGenerating && (areaCoverPreview || (editingArea.coverImageUrl && !removeAreaCover)) && (
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
                        const md = description ?? ""
                        draftMdRef.current = md
                        setEditorMarkdown(md)
                      } catch {
                        alert("Falha ao gerar descrição com IA")
                      }
                    }}
                  >
                    <WandSparkles className="w-4 h-4" />
                    {aiMutation.isPending ? "Gerando com IA..." : "Gerar com IA"}
                  </Button>
                </div>

                {aiMutation.isPending ? (
                  <div className="py-16 text-center text-sm text-zinc-300">
                    Estamos gerando sua descrição com iA…
                  </div>
                ) : (
                  <div className="relative overflow-visible z-[1000]">
                    <MDXEditor
                      className="mdxeditor min-h-[350px] max-h-[65vh] overflow-visible"
                      contentEditableClassName="min-h-[350px] p-4 cursor-text !text-zinc-50 whitespace-pre-wrap"
                      markdown={editorMarkdown}
                      onChange={(md: string) => { draftMdRef.current = md; setEditorMarkdown(md) }}
                      plugins={[
                        toolbarPlugin({
                          toolbarContents: () => (
                            <>
                              <UndoRedo />
                              <Separator />
                              <BoldItalicUnderlineToggles />
                            </>
                          )
                        }),
                        headingsPlugin(),
                        listsPlugin(),
                        thematicBreakPlugin(),
                        markdownShortcutPlugin({ remarkBreaks: true })
                      ]}
                    />
                  </div>
                )}
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
                        // ✅ preserva quebras extras aqui também
                        fd.set("description", preserveVerticalSpace(draftMdRef.current))
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
                        await patchAreaMutation.mutateAsync({
                          ...editingArea,
                          // ✅ preserva quebras extras
                          description: preserveVerticalSpace(draftMdRef.current),
                          coverImageUrl: removeAreaCover ? null : editingArea.coverImageUrl
                        })
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

      {/* Editar link */}
      <Dialog open={!!editingLink} onOpenChange={(v) => !v && (setEditingLink(null), setRemoveLinkCover(false), setLinkCoverPreview(null))}>
        <DialogContent className="overflow-visible w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-300">Editar link</DialogTitle>
          </DialogHeader>
          {editingLink && (
            <div className="space-y-3 text-zinc-300">
              <div>
                <Label className="mb-2 block">Título</Label>
                <Input value={editingLink.title} onChange={(e) => setEditingLink({ ...editingLink, title: e.target.value })} />
              </div>
              <div>
                <Label className="mb-2 block">URL</Label>
                <Input value={editingLink.url} onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })} placeholder="https://" />
              </div>
              <div>
                <Label className="mb-2 block">Descrição</Label>
                <Textarea rows={4} value={editingLink.description ?? ""} onChange={(e) => setEditingLink({ ...editingLink, description: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <Label className="mb-2 block">Capa</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-32 w-32 overflow-hidden rounded-md ring-2 ring-zinc-800">
                    {(linkCoverPreview || (editingLink.coverImageUrl && !removeLinkCover)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={linkCoverPreview || (editingLink.coverImageUrl as string)} alt="Capa do link" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-zinc-800 text-xs text-zinc-400">Capa</div>
                    )}
                    {(linkCoverPreview || (editingLink.coverImageUrl && !removeLinkCover)) && (
                      <button
                        type="button"
                        className="absolute right-1 top-1 z-10 rounded-full border border-zinc-600 bg-zinc-900/80 p-1 text-zinc-200 shadow-md backdrop-blur hover:bg-zinc-800"
                        onClick={() => { setLinkCoverFile(null); setLinkCoverPreview(null); setRemoveLinkCover(true) }}
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
                        setLinkCoverFile(f)
                        setRemoveLinkCover(false)
                        const url = URL.createObjectURL(f)
                        setLinkCoverPreview((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                      }}
                    />
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!editingLink || linkSaving) return
                    try {
                      setLinkSaving(true)
                      if (linkCoverFile) {
                        const fd = new FormData()
                        fd.set("id", editingLink.id)
                        fd.set("title", editingLink.title)
                        fd.set("description", editingLink.description ?? "")
                        fd.set("url", editingLink.url)
                        fd.set("cover", linkCoverFile)
                        const res = await fetch("/api/links", { method: "PATCH", body: fd })
                        if (!res.ok) { alert("Falha ao salvar link"); return }
                        const data = await res.json()
                        setLinks((prev) => prev.map((l) => (l.id === data.link.id ? data.link : l)))
                        await qc.invalidateQueries({ queryKey: ["profile"] })
                        await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                        setLinkCoverFile(null)
                        setLinkCoverPreview(null)
                        setRemoveLinkCover(false)
                        setEditingLink(null)
                      } else {
                        await patchLinkMutation.mutateAsync({
                          ...editingLink,
                          coverImageUrl: removeLinkCover ? null : editingLink.coverImageUrl,
                        })
                        await qc.invalidateQueries({ queryKey: ["profile"] })
                        await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
                        setEditingLink(null)
                        setRemoveLinkCover(false)
                      }
                    } finally {
                      setLinkSaving(false)
                    }
                  }}
                  className="gap-2 cursor-pointer"
                  disabled={linkSaving || patchLinkMutation.isPending}
                  aria-busy={linkSaving || patchLinkMutation.isPending}
                >
                  <Save className="w-4 h-4" /> {linkSaving || patchLinkMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button variant="ghost" className="gap-2 cursor-pointer" onClick={() => setEditingLink(null)}>
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
              <p>Tem certeza que deseja excluir a área &quot;{deleteConfirm.title}&quot;? Essa ação não pode ser desfeita.</p>
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

      {/* Confirmar exclusão de link */}
      <Dialog open={!!deleteLinkConfirm} onOpenChange={(v) => !v && setDeleteLinkConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir link</DialogTitle>
          </DialogHeader>
          {deleteLinkConfirm && (
            <div className="space-y-3 text-zinc-300">
              <p>Tem certeza que deseja excluir o link &quot;{deleteLinkConfirm.title}&quot;? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteLinkConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await deleteLinkMutation.mutateAsync(deleteLinkConfirm.id)
                      showToast("Link excluído")
                    } catch {
                      showToast("Falha ao excluir link")
                    }
                  }}
                  className="cursor-pointer"
                  disabled={deleteLinkMutation.isPending}
                >
                  {deleteLinkMutation.isPending ? "Excluindo..." : "Excluir"}
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
