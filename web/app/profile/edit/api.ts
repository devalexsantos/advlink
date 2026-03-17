import type { Area, LinkItem, GalleryItem, CustomSectionItem, FetchProfileResponse } from "./types"

export async function fetchProfile() {
  const res = await fetch("/api/profile", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar perfil")
  return res.json() as Promise<FetchProfileResponse>
}

export async function updateProfile(data: FormData) {
  const res = await fetch("/api/profile", { method: "PATCH", body: data })
  if (!res.ok) throw new Error("Falha ao salvar perfil")
  return res.json()
}

export async function createArea() {
  const res = await fetch("/api/activity-areas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Nova área", description: "Descrição da área." }) })
  if (!res.ok) throw new Error("Falha ao criar área")
  return res.json() as Promise<{ area: Area }>
}

export async function patchArea(area: Area) {
  const res = await fetch("/api/activity-areas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(area) })
  if (!res.ok) throw new Error("Falha ao salvar área")
  return res.json() as Promise<{ area: Area }>
}

export async function reorderAreas(order: { id: string; position: number }[]) {
  const res = await fetch("/api/activity-areas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  if (!res.ok) throw new Error("Falha ao reordenar áreas")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteArea(id: string) {
  const res = await fetch(`/api/activity-areas?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir área")
  return res.json() as Promise<{ ok: boolean }>
}

export async function createLink() {
  const res = await fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Novo link", description: "", url: "https://" }) })
  if (!res.ok) throw new Error("Falha ao criar link")
  return res.json() as Promise<{ link: LinkItem }>
}

export async function patchLink(link: LinkItem) {
  const res = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link) })
  if (!res.ok) throw new Error("Falha ao salvar link")
  return res.json() as Promise<{ link: LinkItem }>
}

export async function reorderLinks(order: { id: string; position: number }[]) {
  const res = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  if (!res.ok) throw new Error("Falha ao reordenar links")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteLink(id: string) {
  const res = await fetch(`/api/links?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir link")
  return res.json() as Promise<{ ok: boolean }>
}

export async function updateSectionConfig(data: { sectionOrder?: string[]; sectionLabels?: Record<string, string>; sectionIcons?: Record<string, string>; sectionTitleHidden?: Record<string, boolean> }) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Falha ao salvar configuração das seções")
  return res.json()
}

export async function uploadGalleryPhoto(file: File) {
  const fd = new FormData()
  fd.set("cover", file)
  const res = await fetch("/api/gallery", { method: "POST", body: fd })
  if (!res.ok) throw new Error("Falha ao enviar foto")
  return res.json() as Promise<{ item: GalleryItem }>
}

export async function reorderGallery(order: { id: string; position: number }[]) {
  const res = await fetch("/api/gallery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  if (!res.ok) throw new Error("Falha ao reordenar galeria")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteGallery(id: string) {
  const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir foto da galeria")
  return res.json() as Promise<{ ok: boolean }>
}

export async function createCustomSection(formData: FormData) {
  const res = await fetch("/api/custom-sections", { method: "POST", body: formData })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || "Falha ao criar seção")
  }
  return res.json() as Promise<{ section: CustomSectionItem }>
}

export async function patchCustomSection(id: string, formData: FormData) {
  formData.set("id", id)
  const res = await fetch("/api/custom-sections", { method: "PATCH", body: formData })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || "Falha ao salvar seção")
  }
  return res.json() as Promise<{ section: CustomSectionItem }>
}

export async function deleteCustomSection(id: string) {
  const res = await fetch(`/api/custom-sections?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || "Falha ao excluir seção")
  }
  return res.json() as Promise<{ ok: boolean }>
}
