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
import { Camera, Pencil, Plus, Save, Trash2, Upload, WandSparkles, X, ArrowDown, ArrowUp, ExternalLink, Paintbrush, User, MapPin, ListTree, Images, Link as LinkIcon, Search } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import "@mdxeditor/editor/style.css"
import {
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  UndoRedo,
  Separator,
  headingsPlugin,
  listsPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin
} from "@mdxeditor/editor"
import dynamic from "next/dynamic"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from "@/components/ui/accordion"

const MDXEditor = dynamic(() => import("@mdxeditor/editor").then(m => m.MDXEditor), { ssr: false })
const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false })

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
  instagramUrl: z
    .string()
    .url("Informe uma URL válida.")
    .regex(/^https:\/\/(www\.)?instagram\.com\//i, "A URL deve iniciar com https://instagram.com/")
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
  metaDescription: z.string().optional().or(z.literal("").transform(() => undefined)),
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
type GalleryItem = { id: string; coverImageUrl?: string | null; position?: number }
type AddressData = { public?: boolean | null; zipCode?: string | null; street?: string | null; number?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null }
type ProfileData = {
  publicName?: string | null
  aboutDescription?: string | null
  publicEmail?: string | null
  publicPhone?: string | null
  whatsapp?: string | null
  instagramUrl?: string | null
  calendlyUrl?: string | null
  avatarUrl?: string | null
  coverUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
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
  return res.json() as Promise<{ profile: ProfileData | null; areas: Area[]; address?: AddressData; links: LinkItem[]; gallery: GalleryItem[] }>
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

// Gallery API
async function uploadGalleryPhoto(file: File) {
  const fd = new FormData()
  fd.set("cover", file)
  const res = await fetch("/api/gallery", { method: "POST", body: fd })
  if (!res.ok) throw new Error("Falha ao enviar foto")
  return res.json() as Promise<{ item: GalleryItem }>
}
async function reorderGallery(order: { id: string; position: number }[]) {
  const res = await fetch("/api/gallery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  if (!res.ok) throw new Error("Falha ao reordenar galeria")
  return res.json() as Promise<{ ok: boolean }>
}
async function deleteGallery(id: string) {
  const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir foto da galeria")
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
      instagramUrl: "",
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
  const [gallery, setGallery] = useState<GalleryItem[]>([])
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
  const [secondaryColor, setSecondaryColor] = useState<string>("#FFFFFF")
  const [textColor, setTextColor] = useState<string>("#FFFFFF")
  const [theme, setTheme] = useState<"modern" | "classic">("modern")
  const [areaSaving, setAreaSaving] = useState(false)
  const [removeAreaCover, setRemoveAreaCover] = useState(false)
  const [linkSaving, setLinkSaving] = useState(false)
  const [removeLinkCover, setRemoveLinkCover] = useState(false)
  // Avatar cropper state
  const [avatarCropOpen, setAvatarCropOpen] = useState<boolean>(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const pendingAvatarFileRef = useRef<File | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [coverCropOpen, setCoverCropOpen] = useState<boolean>(false)
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null)
  const pendingCoverFileRef = useRef<File | null>(null)
  const [coverCrop, setCoverCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [coverZoom, setCoverZoom] = useState<number>(1)
  const [coverCroppedAreaPixels, setCoverCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)


  async function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (err) => reject(err))
      image.setAttribute("crossOrigin", "anonymous")
      image.src = url
    })
  }

  async function getCroppedBlob(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob> {
    const image = await createImage(imageSrc)
    const outputCanvas = document.createElement("canvas")
    const outputCtx = outputCanvas.getContext("2d") as CanvasRenderingContext2D
    outputCanvas.width = pixelCrop.width
    outputCanvas.height = pixelCrop.height

    outputCtx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise<Blob>((resolve) => {
      outputCanvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.92)
    })
  }
  const [deleteConfirm, setDeleteConfirm] = useState<Area | null>(null)
  const [deleteLinkConfirm, setDeleteLinkConfirm] = useState<LinkItem | null>(null)
  const [deleteGalleryConfirm, setDeleteGalleryConfirm] = useState<GalleryItem | null>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
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
      instagramUrl: p.instagramUrl ?? "",
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
    setSecondaryColor((p.secondaryColor as string) ?? "#FFFFFF")
    setTextColor((p.textColor as string) ?? "#FFFFFF")
    setTheme(((p.theme as string) === "classic" ? "classic" : "modern"))
    // slug edition moved to PublishedCTA; no local slug state here
    setAreas(data.areas ?? [])
    setLinks((data as unknown as { links?: LinkItem[] }).links ?? [])
    setGallery((data as unknown as { gallery?: GalleryItem[] }).gallery ?? [])
    // Carrega "Sobre mim" no MDX com quebras preservadas (decodificando entidades)
    const rawAbout = p.aboutDescription ?? ""
    const initialAbout = decodeEntities(rawAbout)
    setAboutMarkdown(initialAbout)
  }, [data, reset])

  const saveProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (res: unknown) => {
      // Atualiza imediatamente o cache para refletir slug/fields mais recentes no UI (PublishedCTA etc.)
      qc.setQueryData(["profile"], (old: unknown) => {
        const next = (res as { profile?: Record<string, unknown> } | null) || null
        if (!old) return next
        const oldObj = old as { profile?: Record<string, unknown> }
        return { ...oldObj, profile: { ...(oldObj.profile || {}), ...(next?.profile || {}) } }
      })
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

  // Gallery mutations
  const uploadGalleryMutation = useMutation({
    mutationFn: uploadGalleryPhoto,
    onMutate: () => setGalleryUploading(true),
    onSettled: () => setGalleryUploading(false),
    onSuccess: async (res) => {
      setGallery((prev) => [...prev, res.item])
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const reorderGalleryMutation = useMutation({
    mutationFn: reorderGallery,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    }
  })
  const deleteGalleryMutation = useMutation({
    mutationFn: deleteGallery,
    onSuccess: async () => {
      setGallery((prev) => prev.filter((g) => g.id !== (deleteGalleryConfirm?.id ?? "")))
      setDeleteGalleryConfirm(null)
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
    const fd = new FormData()
    fd.set("publicName", values.publicName)
    // Usa o MDX "Sobre mim" (aboutMarkdown) com preservação de quebras extras
    fd.set("aboutDescription", preserveVerticalSpace(aboutMarkdown || ""))
    if (values.publicEmail) fd.set("publicEmail", values.publicEmail)
    if (values.publicPhone) fd.set("publicPhone", values.publicPhone)
    if (values.whatsapp) fd.set("whatsapp", values.whatsapp)
    fd.set("instagramUrl", values.instagramUrl ?? "")
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
    fd.set("secondaryColor", secondaryColor)
    fd.set("textColor", textColor)
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

  // slug edition removed; handled in PublishedCTA

  if (isLoading) return <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">Carregando…</div>

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
        {/* Sticky top bar with actions */}
        <div className="hidden md:flex pb-3 z-10 bg-zinc-900/70 backdrop-blur-md border-b border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg">
            <h1 className="text-2xl font-semibold">Editar informações</h1>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => {
                const currentSlug = (data?.profile?.slug || '').trim()
                const url = currentSlug ? `https://${encodeURIComponent(currentSlug)}.advlink.site` : '/profile/edit'
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
        <Accordion type="single" defaultValue="visual">
          <AccordionItem value="visual">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <Paintbrush className="w-4 h-4" />
                <span>Estilo</span>
              </div>
              </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
{/* Tema */}
<div>
          <Label className="mb-2 text-lg block font-bold">Tema</Label>
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
            <Label htmlFor="secondaryColor" className="mb-2 block font-bold">Cor de Títulos</Label>
            <input id="secondaryColor" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-20 w-20 border border-zinc-800 bg-zinc-900"/>
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
              <label className="inline-flex text-zinc-900 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-50 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-100">
                <Upload className="w-4 h-4" />
                <span className="text-zinc-900">Enviar foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setRemoveAvatar(false)
                  pendingAvatarFileRef.current = f
                  const reader = new FileReader()
                  reader.onload = () => {
                    setAvatarCropSrc(reader.result as string)
                    setZoom(1)
                    setCrop({ x: 0, y: 0 })
                    setAvatarCropOpen(true)
                  }
                  reader.readAsDataURL(f)
                }} />
              </label>
            </div>
          </div>
        </div>

        {/* Link público movido para PublishedCTA (edição removida aqui) */}

        {/* Capa */}
        <div className="flex flex-col gap-2 mt-4">
          <Label className="mb-2 block font-bold">Capa da página</Label>
          <div className="flex flex-col gap-4">
            <div>
          <label className="inline-flex text-zinc-900 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-50 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-100">
                <Upload className="w-4 h-4" />
                <span>Enviar capa</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setRemoveCover(false)
                  pendingCoverFileRef.current = f
                  const reader = new FileReader()
                  reader.onload = () => {
                    setCoverCropSrc(reader.result as string)
                    setCoverZoom(1)
                    setCoverCrop({ x: 0, y: 0 })
                    setCoverCropOpen(true)
                  }
                  reader.readAsDataURL(f)
                }} />
              </label>
              </div>
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
          </div>
        </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="perfil">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <User className="w-4 h-4" />
                <span>Perfil e Contato</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
              {/* Perfil */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="publicName" className="mb-2 block font-bold">Nome de exibição <span className="text-red-500" aria-hidden>*</span></Label>
          <Input id="publicName" {...register("publicName")} />
          {errors.publicName && <p className="mt-1 text-sm text-red-400">{errors.publicName.message}</p>}
        </div>
        <div className="mt-4">
          <Label htmlFor="aboutDescription" className="mb-2 block font-bold">Sobre mim</Label>
          <div className="relative overflow-visible border border-zinc-800 bg-zinc-900/50 rounded-md">
            <MDXEditor
              className="mdxeditor min-h-[200px] max-h-[65vh] overflow-visible"
              contentEditableClassName="min-h-[210px] p-4 cursor-text !text-zinc-50 whitespace-pre-wrap"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="publicEmail" className="mb-2 block font-bold">E-mail para contato</Label>
            <Input id="publicEmail" type="email" {...register("publicEmail")} />
            {errors.publicEmail && <p className="mt-1 text-sm text-red-400">{errors.publicEmail.message}</p>}
          </div>
          <div>
            <Label htmlFor="publicPhone" className="mb-2 block font-bold">Telefone</Label>
            <Input id="publicPhone" {...register("publicPhone")} />
          </div>
          {/* WhatsApp & Instagram */}
          <div>
            <Label htmlFor="whatsapp" className="mb-2 block">WhatsApp</Label>
            <Input id="whatsapp" placeholder="(00) 00000-0000" {...register("whatsapp")} />
          </div>
          <div>
            <Label htmlFor="instagramUrl" className="mb-2 block">Instagram URL</Label>
            <Input id="instagramUrl" placeholder="https://instagram.com/seu_usuario" {...register("instagramUrl")} />
            {errors.instagramUrl && <p className="mt-1 text-sm text-red-400">{errors.instagramUrl.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="calendlyUrl" className="mb-2 block font-bold">Calendly URL</Label>
          <Input id="calendlyUrl" placeholder="https://calendly.com/seu-usuario" {...register("calendlyUrl")} />
          {errors.calendlyUrl && <p className="mt-1 text-sm text-red-400">{errors.calendlyUrl.message}</p>}
        </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="endereco">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <MapPin className="w-4 h-4" />
                <span>Endereço</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
              {/* Endereço */}
        <div className="space-y-3">
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
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="areas">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <ListTree className="w-4 h-4" />
                <span>Áreas ou serviços</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
{/* Lista de áreas */}
<div className="space-y-2">
          <div className="mb-4 flex items-center justify-between">
            <Button type="button" variant="secondary" className="gap-2 cursor-pointer" onClick={() => createAreaMutation.mutate()}>
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
                    className="h-8 w-8 cursor-pointer"
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
                    className="h-8 w-8 cursor-pointer"
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
                    className="gap-2 cursor-pointer"
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
                    className="h-8 w-8 cursor-pointer"
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
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="galeria">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <Images className="w-4 h-4" />
                <span>Galeria</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
              {/* Galeria */}
        <div className="space-y-2">
          <div className="mb-4 flex items-center justify-between">
            <label className={`inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 cursor-pointer ${galleryUploading ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-100'}`}>
              <Upload className="w-4 h-4" />
              <span>
                {galleryUploading ? 'Enviando...' : 'Nova foto'}
                </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={galleryUploading}
                onChange={async (e) => {
                  const inputEl = e.currentTarget as HTMLInputElement
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    await uploadGalleryMutation.mutateAsync(f)
                    showToast('Foto adicionada à galeria')
                  } catch {
                    showToast('Falha ao enviar foto')
                  } finally {
                    if (inputEl) inputEl.value = ''
                  }
                }}
              />
            </label>
          </div>
          <div className="space-y-2">
            {gallery.map((g, idx) => (
              <div
                key={g.id}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <div className="flex items-center gap-3 w-full min-w-0">
                  <span className="text-xs text-zinc-400 w-6 text-right hidden md:inline-block">{idx + 1}</span>
                  <div className="h-10 w-10 rounded overflow-hidden ring-1 ring-zinc-800 bg-zinc-800 shrink-0">
                    {g.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.coverImageUrl} alt="Thumb" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 w-full md:w-auto justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 cursor-pointer"
                    disabled={idx === 0 || reorderGalleryMutation.isPending}
                    onClick={async () => {
                      const next = [...gallery]
                      const tmp = next[idx - 1]
                      next[idx - 1] = next[idx]
                      next[idx] = tmp
                      setGallery(next)
                      const order = next.map((it, i) => ({ id: it.id as string, position: i + 1 }))
                      try { await reorderGalleryMutation.mutateAsync(order) } catch { showToast('Falha ao reordenar galeria') }
                    }}
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 cursor-pointer"
                    disabled={idx === gallery.length - 1 || reorderGalleryMutation.isPending}
                    onClick={async () => {
                      const next = [...gallery]
                      const tmp = next[idx + 1]
                      next[idx + 1] = next[idx]
                      next[idx] = tmp
                      setGallery(next)
                      const order = next.map((it, i) => ({ id: it.id as string, position: i + 1 }))
                      try { await reorderGalleryMutation.mutateAsync(order) } catch { showToast('Falha ao reordenar galeria') }
                    }}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setDeleteGalleryConfirm(g)}
                    aria-label="Excluir foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="links">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <LinkIcon className="w-4 h-4" />
                <span>Links</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
              {/* Links */}
        <div className="space-y-2">
          <div className="mb-4 flex items-center justify-between">
            <Button type="button" variant="secondary" className="gap-2 cursor-pointer" onClick={() => createLinkMutation.mutate()}>
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
                    className="h-8 w-8 cursor-pointer"
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
                    className="h-8 w-8 cursor-pointer"
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
                    className="gap-2 cursor-pointer"
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
                    className="h-8 w-8 cursor-pointer"
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
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="seo">
            <AccordionTrigger className="cursor-pointer hover:bg-zinc-900/50 rounded-xl p-2">
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <Search className="w-4 h-4" />
                <span>SEO</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-zinc-900/50 p-2 rounded-xl mb-8 mt-2">
{/* SEO */}
<div className="space-y-2">
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
        </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveProfileMutation.isPending} className="gap-2 w-full cursor-pointer">
            <Save className="w-4 h-4" />
            {saveProfileMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>

      {/* Cover Crop Dialog */}
      <Dialog open={coverCropOpen} onOpenChange={(v) => setCoverCropOpen(v)}>
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-300">Ajustar capa da página</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[50vh] bg-zinc-900 rounded-md overflow-hidden">
            {coverCropSrc && (
              // @ts-expect-error dynamic import type
              <Cropper
                image={coverCropSrc}
                crop={coverCrop}
                zoom={coverZoom}
                aspect={16/9}
                restrictPosition={false}
                showGrid={false}
                onCropChange={setCoverCrop}
                onZoomChange={setCoverZoom}
                onCropComplete={(_, areaPixels) => setCoverCroppedAreaPixels(areaPixels)}
              />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-zinc-400">Zoom</Label>
              <input type="range" min={1} max={3} step={0.01} value={coverZoom} onChange={(e) => setCoverZoom(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
          <DialogFooter className="flex flex-col md:flex-row gap-3">
          <Button
              type="button"
              className="cursor-pointer"
              onClick={async () => {
                if (!coverCropSrc || !coverCroppedAreaPixels) return
                try {
                  const blob = await getCroppedBlob(coverCropSrc, coverCroppedAreaPixels)
                  const fileName = pendingCoverFileRef.current?.name || "cover.jpg"
                  const croppedFile = new File([blob], fileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
                  setCoverFile(croppedFile)
                  const url = URL.createObjectURL(croppedFile)
                  setCoverPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                } finally {
                  setCoverCropOpen(false)
                  setCoverCropSrc(null)
                  pendingCoverFileRef.current = null
                }
              }}
            >
              Salvar recorte
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setCoverCropOpen(false)
                setCoverCropSrc(null)
                pendingCoverFileRef.current = null
              }}
            >
              Cancelar
            </Button>
            
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      <Dialog open={avatarCropOpen} onOpenChange={(v) => setAvatarCropOpen(v)}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-300">Ajustar foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-80 bg-zinc-900 rounded-md overflow-hidden">
            {avatarCropSrc && (
              // @ts-expect-error dynamic import type
              <Cropper
                image={avatarCropSrc}
                crop={crop}
                zoom={zoom}
                
                aspect={1}
                restrictPosition={false}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-zinc-400">Zoom</Label>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full" />
            </div>
            
          </div>
          <DialogFooter className="flex flex-col md:flex-row gap-3">
          <Button
              type="button"
              className="cursor-pointer"
              onClick={async () => {
                if (!avatarCropSrc || !croppedAreaPixels) return
                try {
                  const blob = await getCroppedBlob(avatarCropSrc, croppedAreaPixels)
                  const fileName = pendingAvatarFileRef.current?.name || "avatar.jpg"
                  const croppedFile = new File([blob], fileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
                  setPhotoFile(croppedFile)
                  const url = URL.createObjectURL(croppedFile)
                  setPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
                } finally {
                  setAvatarCropOpen(false)
                  setAvatarCropSrc(null)
                  pendingAvatarFileRef.current = null
                }
              }}
            >
              Salvar recorte
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                setAvatarCropOpen(false)
                setAvatarCropSrc(null)
                pendingAvatarFileRef.current = null
              }}
            >
              Cancelar
            </Button>
           
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingArea} onOpenChange={(v) => !v && (setEditingArea(null), setRemoveAreaCover(false), setAreaCoverPreview(null), setAreaCoverGenerating(false))}>
        <DialogContent className="w-full max-w-6xl h-screen overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-300">Editar área</DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setEditingArea(null)}
            aria-label="Fechar modal"
            className="absolute right-3 top-3 z-20 rounded-full bg-white text-zinc-900 p-2 shadow-md border border-zinc-300 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
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
                  <div className="relative z-[1000] max-h-[150px] md:max-h-[55vh] overflow-auto">
                    <MDXEditor
                      className="mdxeditor min-h-[300px] max-h-[150px] md:max-h-[55vh] overflow-auto"
                      contentEditableClassName="min-h-[300px] p-4 cursor-text !text-zinc-50 whitespace-pre-wrap"
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
          <button
            type="button"
            onClick={() => setEditingLink(null)}
            aria-label="Fechar modal"
            className="absolute right-3 top-3 z-20 rounded-full bg-white text-zinc-900 p-2 shadow-md border border-zinc-300 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
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

      {/* Confirmar exclusão de foto da galeria */}
      <Dialog open={!!deleteGalleryConfirm} onOpenChange={(v) => !v && setDeleteGalleryConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir foto</DialogTitle>
          </DialogHeader>
          {deleteGalleryConfirm && (
            <div className="space-y-3 text-zinc-300">
              <p>Tem certeza que deseja excluir esta foto da galeria? Essa ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteGalleryConfirm(null)} className="cursor-pointer">Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await deleteGalleryMutation.mutateAsync(deleteGalleryConfirm.id as string)
                      showToast("Foto excluída")
                    } catch {
                      showToast("Falha ao excluir foto")
                    }
                  }}
                  className="cursor-pointer"
                  disabled={deleteGalleryMutation.isPending}
                >
                  {deleteGalleryMutation.isPending ? "Excluindo..." : "Excluir"}
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
