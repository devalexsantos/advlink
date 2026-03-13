"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/toast/ToastProvider"
import {
  profileEditSchema,
  type ProfileEditValues,
  type Area,
  type LinkItem,
  type GalleryItem,
  type FetchProfileResponse,
} from "./types"
import { DEFAULT_SECTION_ORDER, getSectionOrder, type SectionKey, type SectionLabels } from "@/lib/section-order"
import {
  fetchProfile,
  updateProfile,
  updateSectionConfig,
  createArea as createAreaApi,
  patchArea as patchAreaApi,
  reorderAreas as reorderAreasApi,
  deleteArea as deleteAreaApi,
  createLink as createLinkApi,
  patchLink as patchLinkApi,
  reorderLinks as reorderLinksApi,
  deleteLink as deleteLinkApi,
  uploadGalleryPhoto as uploadGalleryPhotoApi,
  reorderGallery as reorderGalleryApi,
  deleteGallery as deleteGalleryApi,
} from "./api"

// ---- Helpers ----
function decodeEntities(s: string) {
  if (typeof window === "undefined") {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  }
  const ta = document.createElement("textarea")
  ta.innerHTML = s
  return ta.value
}

function preserveVerticalSpace(md: string) {
  return md.replace(/\n{3,}/g, (block) => {
    const extra = block.length - 2
    return "\n\n" + Array.from({ length: extra }).map(() => "<br />").join("\n")
  })
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
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
  outputCtx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise<Blob>((resolve) => {
    outputCanvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.92)
  })
}

// ---- Context type ----
type EditFormContextType = {
  form: UseFormReturn<ProfileEditValues>
  data: FetchProfileResponse | undefined
  isLoading: boolean
  // States
  areas: Area[]
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>
  links: LinkItem[]
  setLinks: React.Dispatch<React.SetStateAction<LinkItem[]>>
  gallery: GalleryItem[]
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>
  editingArea: Area | null
  setEditingArea: React.Dispatch<React.SetStateAction<Area | null>>
  editingLink: LinkItem | null
  setEditingLink: React.Dispatch<React.SetStateAction<LinkItem | null>>
  areaCoverFile: File | null
  setAreaCoverFile: React.Dispatch<React.SetStateAction<File | null>>
  areaCoverPreview: string | null
  setAreaCoverPreview: React.Dispatch<React.SetStateAction<string | null>>
  linkCoverFile: File | null
  setLinkCoverFile: React.Dispatch<React.SetStateAction<File | null>>
  linkCoverPreview: string | null
  setLinkCoverPreview: React.Dispatch<React.SetStateAction<string | null>>
  previewUrl: string | null
  setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>
  photoFile: File | null
  setPhotoFile: React.Dispatch<React.SetStateAction<File | null>>
  removeAvatar: boolean
  setRemoveAvatar: React.Dispatch<React.SetStateAction<boolean>>
  coverPreviewUrl: string | null
  setCoverPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>
  coverFile: File | null
  setCoverFile: React.Dispatch<React.SetStateAction<File | null>>
  removeCover: boolean
  setRemoveCover: React.Dispatch<React.SetStateAction<boolean>>
  areaCoverGenerating: boolean
  setAreaCoverGenerating: React.Dispatch<React.SetStateAction<boolean>>
  primaryColor: string
  setPrimaryColor: React.Dispatch<React.SetStateAction<string>>
  secondaryColor: string
  setSecondaryColor: React.Dispatch<React.SetStateAction<string>>
  textColor: string
  setTextColor: React.Dispatch<React.SetStateAction<string>>
  theme: "modern" | "classic" | "corporate"
  setTheme: React.Dispatch<React.SetStateAction<"modern" | "classic" | "corporate">>
  areaSaving: boolean
  setAreaSaving: React.Dispatch<React.SetStateAction<boolean>>
  removeAreaCover: boolean
  setRemoveAreaCover: React.Dispatch<React.SetStateAction<boolean>>
  linkSaving: boolean
  setLinkSaving: React.Dispatch<React.SetStateAction<boolean>>
  removeLinkCover: boolean
  setRemoveLinkCover: React.Dispatch<React.SetStateAction<boolean>>
  publicPhoneIsFixed: boolean
  setPublicPhoneIsFixed: React.Dispatch<React.SetStateAction<boolean>>
  whatsappIsFixed: boolean
  setWhatsappIsFixed: React.Dispatch<React.SetStateAction<boolean>>
  // Section order
  sectionOrder: SectionKey[]
  setSectionOrder: React.Dispatch<React.SetStateAction<SectionKey[]>>
  sectionLabels: SectionLabels
  setSectionLabels: React.Dispatch<React.SetStateAction<SectionLabels>>
  updateSectionConfigMutation: ReturnType<typeof useMutation<unknown, Error, { sectionOrder?: string[]; sectionLabels?: Record<string, string> }>>
  // Avatar cropper
  avatarCropOpen: boolean
  setAvatarCropOpen: React.Dispatch<React.SetStateAction<boolean>>
  avatarCropSrc: string | null
  setAvatarCropSrc: React.Dispatch<React.SetStateAction<string | null>>
  pendingAvatarFileRef: React.MutableRefObject<File | null>
  crop: { x: number; y: number }
  setCrop: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  zoom: number
  setZoom: React.Dispatch<React.SetStateAction<number>>
  croppedAreaPixels: { x: number; y: number; width: number; height: number } | null
  setCroppedAreaPixels: React.Dispatch<React.SetStateAction<{ x: number; y: number; width: number; height: number } | null>>
  // Cover cropper
  coverCropOpen: boolean
  setCoverCropOpen: React.Dispatch<React.SetStateAction<boolean>>
  coverCropSrc: string | null
  setCoverCropSrc: React.Dispatch<React.SetStateAction<string | null>>
  pendingCoverFileRef: React.MutableRefObject<File | null>
  coverCrop: { x: number; y: number }
  setCoverCrop: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  coverZoom: number
  setCoverZoom: React.Dispatch<React.SetStateAction<number>>
  coverCroppedAreaPixels: { x: number; y: number; width: number; height: number } | null
  setCoverCroppedAreaPixels: React.Dispatch<React.SetStateAction<{ x: number; y: number; width: number; height: number } | null>>
  // Delete confirmations
  deleteConfirm: Area | null
  setDeleteConfirm: React.Dispatch<React.SetStateAction<Area | null>>
  deleteLinkConfirm: LinkItem | null
  setDeleteLinkConfirm: React.Dispatch<React.SetStateAction<LinkItem | null>>
  deleteGalleryConfirm: GalleryItem | null
  setDeleteGalleryConfirm: React.Dispatch<React.SetStateAction<GalleryItem | null>>
  galleryUploading: boolean
  // About markdown
  aboutMarkdown: string
  setAboutMarkdown: React.Dispatch<React.SetStateAction<string>>
  editorMarkdown: string
  setEditorMarkdown: React.Dispatch<React.SetStateAction<string>>
  draftMdRef: React.MutableRefObject<string>
  // Mutations
  saveProfileMutation: ReturnType<typeof useMutation<unknown, Error, FormData>>
  updateThemeMutation: ReturnType<typeof useMutation<unknown, Error, "modern" | "classic" | "corporate">>
  createAreaMutation: ReturnType<typeof useMutation<{ area: Area }, Error, void>>
  patchAreaMutation: ReturnType<typeof useMutation<{ area: Area }, Error, Area>>
  reorderMutation: ReturnType<typeof useMutation<{ ok: boolean }, Error, { id: string; position: number }[]>>
  deleteMutation: ReturnType<typeof useMutation<{ ok: boolean }, Error, string>>
  createLinkMutation: ReturnType<typeof useMutation<{ link: LinkItem }, Error, void>>
  patchLinkMutation: ReturnType<typeof useMutation<{ link: LinkItem }, Error, LinkItem>>
  reorderLinksMutation: ReturnType<typeof useMutation<{ ok: boolean }, Error, { id: string; position: number }[]>>
  deleteLinkMutation: ReturnType<typeof useMutation<{ ok: boolean }, Error, string>>
  uploadGalleryMutation: ReturnType<typeof useMutation<{ item: GalleryItem }, Error, File>>
  reorderGalleryMutation: ReturnType<typeof useMutation<{ ok: boolean }, Error, { id: string; position: number }[]>>
  deleteGalleryMutation: ReturnType<typeof useMutation<{ ok: boolean }, Error, string>>
  // Utilities
  preserveVerticalSpace: (md: string) => string
  getCroppedBlob: (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }) => Promise<Blob>
  showToast: (msg: string) => void
}

const EditFormContext = createContext<EditFormContextType | null>(null)

export function useEditForm() {
  const ctx = useContext(EditFormContext)
  if (!ctx) throw new Error("useEditForm must be used within EditFormProvider")
  return ctx
}

export function EditFormProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile })

  const form = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      publicName: "",
      headline: "",
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
      state: "",
    },
  })

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
  const [theme, setTheme] = useState<"modern" | "classic" | "corporate">("modern")
  const [areaSaving, setAreaSaving] = useState(false)
  const [removeAreaCover, setRemoveAreaCover] = useState(false)
  const [linkSaving, setLinkSaving] = useState(false)
  const [removeLinkCover, setRemoveLinkCover] = useState(false)
  const [publicPhoneIsFixed, setPublicPhoneIsFixed] = useState<boolean>(false)
  const [whatsappIsFixed, setWhatsappIsFixed] = useState<boolean>(false)
  // Section order
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>([...DEFAULT_SECTION_ORDER])
  const [sectionLabels, setSectionLabels] = useState<SectionLabels>({})
  // Avatar cropper
  const [avatarCropOpen, setAvatarCropOpen] = useState<boolean>(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const pendingAvatarFileRef = useRef<File | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  // Cover cropper
  const [coverCropOpen, setCoverCropOpen] = useState<boolean>(false)
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null)
  const pendingCoverFileRef = useRef<File | null>(null)
  const [coverCrop, setCoverCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [coverZoom, setCoverZoom] = useState<number>(1)
  const [coverCroppedAreaPixels, setCoverCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  // Delete confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<Area | null>(null)
  const [deleteLinkConfirm, setDeleteLinkConfirm] = useState<LinkItem | null>(null)
  const [deleteGalleryConfirm, setDeleteGalleryConfirm] = useState<GalleryItem | null>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  // About markdown
  const draftMdRef = useRef<string>("")
  const [editorMarkdown, setEditorMarkdown] = useState<string>("")
  const [aboutMarkdown, setAboutMarkdown] = useState<string>("")

  // Sync data from server — form.reset only on initial load
  const initialSyncDone = useRef(false)

  useEffect(() => {
    if (!data) return

    // Lists always sync (managed by their own mutations)
    setAreas(data.areas ?? [])
    setLinks(data.links ?? [])
    setGallery(data.gallery ?? [])

    // Form + local state only on initial load
    if (initialSyncDone.current) return
    initialSyncDone.current = true

    const p = data.profile ?? {}
    const a = data.address ?? {}
    form.reset({
      publicName: p.publicName ?? "",
      headline: p.headline ?? "",
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
    setPublicPhoneIsFixed(Boolean(p.publicPhoneIsFixed))
    setWhatsappIsFixed(Boolean(p.whatsappIsFixed))
    setPrimaryColor((p.primaryColor as string) ?? "#8B0000")
    setSecondaryColor((p.secondaryColor as string) ?? "#FFFFFF")
    setTextColor((p.textColor as string) ?? "#FFFFFF")
    setTheme(((p.theme as string) === "classic" ? "classic" : (p.theme as string) === "corporate" ? "corporate" : "modern"))
    setSectionOrder(getSectionOrder(p.sectionOrder as SectionKey[] | undefined))
    setSectionLabels((p.sectionLabels as SectionLabels) || {})
    const rawAbout = p.aboutDescription ?? ""
    const initialAbout = decodeEntities(rawAbout)
    setAboutMarkdown(initialAbout)
  }, [data, form])

  useEffect(() => {
    if (editingArea) {
      const raw = editingArea.description ?? ""
      const initial = decodeEntities(raw)
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

  // Mutations
  const saveProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (res: unknown) => {
      qc.setQueryData(["profile"], (old: unknown) => {
        const next = (res as { profile?: Record<string, unknown>; address?: Record<string, unknown> } | null) || null
        if (!old) return next
        const oldObj = old as { profile?: Record<string, unknown>; address?: Record<string, unknown> }
        return {
          ...oldObj,
          profile: { ...(oldObj.profile || {}), ...(next?.profile || {}) },
          address: next?.address !== undefined ? next.address : oldObj.address,
        }
      })
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: "modern" | "classic" | "corporate") => {
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
    },
  })

  const updateSectionConfigMutation = useMutation({
    mutationFn: updateSectionConfig,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const createAreaMutation = useMutation({
    mutationFn: createAreaApi,
    onSuccess: async (res) => {
      setAreas((prev) => [...prev, res.area])
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const patchAreaMutation = useMutation({
    mutationFn: patchAreaApi,
    onSuccess: async (res) => {
      setAreas((prev) => prev.map((a) => (a.id === res.area.id ? res.area : a)))
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: reorderAreasApi,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAreaApi,
    onSuccess: async () => {
      setAreas((prev) => prev.filter((a) => a.id !== (deleteConfirm?.id ?? "")))
      setDeleteConfirm(null)
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const createLinkMutation = useMutation({
    mutationFn: createLinkApi,
    onSuccess: async (res) => {
      setLinks((prev) => [...prev, res.link])
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const patchLinkMutation = useMutation({
    mutationFn: patchLinkApi,
    onSuccess: async (res) => {
      setLinks((prev) => prev.map((l) => (l.id === res.link.id ? res.link : l)))
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const reorderLinksMutation = useMutation({
    mutationFn: reorderLinksApi,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const deleteLinkMutation = useMutation({
    mutationFn: deleteLinkApi,
    onSuccess: async () => {
      setLinks((prev) => prev.filter((l) => l.id !== (deleteLinkConfirm?.id ?? "")))
      setDeleteLinkConfirm(null)
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const uploadGalleryMutation = useMutation({
    mutationFn: uploadGalleryPhotoApi,
    onMutate: () => setGalleryUploading(true),
    onSettled: () => setGalleryUploading(false),
    onSuccess: async (res) => {
      setGallery((prev) => [...prev, res.item])
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const reorderGalleryMutation = useMutation({
    mutationFn: reorderGalleryApi,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  const deleteGalleryMutation = useMutation({
    mutationFn: deleteGalleryApi,
    onSuccess: async () => {
      setGallery((prev) => prev.filter((g) => g.id !== (deleteGalleryConfirm?.id ?? "")))
      setDeleteGalleryConfirm(null)
      await qc.invalidateQueries({ queryKey: ["profile"], exact: false })
      await qc.refetchQueries({ queryKey: ["profile"], type: "active" })
    },
  })

  async function onSubmit(values: ProfileEditValues) {
    const fd = new FormData()
    fd.set("publicName", values.publicName)
    if (values.headline) fd.set("headline", values.headline)
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
    fd.set("addressPublic", String(values.addressPublic ?? true))
    fd.set("zipCode", values.zipCode ?? "")
    fd.set("street", values.street ?? "")
    fd.set("number", values.number ?? "")
    fd.set("complement", values.complement ?? "")
    fd.set("neighborhood", values.neighborhood ?? "")
    fd.set("city", values.city ?? "")
    fd.set("state", values.state ?? "")
    fd.set("primaryColor", primaryColor)
    fd.set("secondaryColor", secondaryColor)
    fd.set("textColor", textColor)
    if (removeAvatar) fd.set("removeAvatar", "true")
    if (photoFile) fd.set("photo", photoFile)
    if (removeCover) fd.set("removeCover", "true")
    if (coverFile) fd.set("cover", coverFile)
    fd.set("publicPhoneIsFixed", String(publicPhoneIsFixed))
    fd.set("whatsappIsFixed", String(whatsappIsFixed))
    await saveProfileMutation.mutateAsync(fd)
    // Commit current values as new defaults so RHF state stays in sync
    form.reset(form.getValues())
    showToast("Salvo com sucesso!")
  }

  const value: EditFormContextType = {
    form,
    data,
    isLoading,
    areas, setAreas,
    links, setLinks,
    gallery, setGallery,
    editingArea, setEditingArea,
    editingLink, setEditingLink,
    areaCoverFile, setAreaCoverFile,
    areaCoverPreview, setAreaCoverPreview,
    linkCoverFile, setLinkCoverFile,
    linkCoverPreview, setLinkCoverPreview,
    previewUrl, setPreviewUrl,
    photoFile, setPhotoFile,
    removeAvatar, setRemoveAvatar,
    coverPreviewUrl, setCoverPreviewUrl,
    coverFile, setCoverFile,
    removeCover, setRemoveCover,
    areaCoverGenerating, setAreaCoverGenerating,
    primaryColor, setPrimaryColor,
    secondaryColor, setSecondaryColor,
    textColor, setTextColor,
    theme, setTheme,
    areaSaving, setAreaSaving,
    removeAreaCover, setRemoveAreaCover,
    linkSaving, setLinkSaving,
    removeLinkCover, setRemoveLinkCover,
    publicPhoneIsFixed, setPublicPhoneIsFixed,
    whatsappIsFixed, setWhatsappIsFixed,
    sectionOrder, setSectionOrder,
    sectionLabels, setSectionLabels,
    updateSectionConfigMutation,
    avatarCropOpen, setAvatarCropOpen,
    avatarCropSrc, setAvatarCropSrc,
    pendingAvatarFileRef,
    crop, setCrop,
    zoom, setZoom,
    croppedAreaPixels, setCroppedAreaPixels,
    coverCropOpen, setCoverCropOpen,
    coverCropSrc, setCoverCropSrc,
    pendingCoverFileRef,
    coverCrop, setCoverCrop,
    coverZoom, setCoverZoom,
    coverCroppedAreaPixels, setCoverCroppedAreaPixels,
    deleteConfirm, setDeleteConfirm,
    deleteLinkConfirm, setDeleteLinkConfirm,
    deleteGalleryConfirm, setDeleteGalleryConfirm,
    galleryUploading,
    aboutMarkdown, setAboutMarkdown,
    editorMarkdown, setEditorMarkdown,
    draftMdRef,
    saveProfileMutation,
    updateThemeMutation,
    createAreaMutation,
    patchAreaMutation,
    reorderMutation,
    deleteMutation,
    createLinkMutation,
    patchLinkMutation,
    reorderLinksMutation,
    deleteLinkMutation,
    uploadGalleryMutation,
    reorderGalleryMutation,
    deleteGalleryMutation,
    preserveVerticalSpace,
    getCroppedBlob,
    showToast,
  }

  return (
    <EditFormContext.Provider value={value}>
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
        const first = Object.values(errors)[0]
        const msg = first?.message ?? "Verifique os campos do formulário."
        showToast(msg)
      })}>
        {children}
      </form>
    </EditFormContext.Provider>
  )
}
