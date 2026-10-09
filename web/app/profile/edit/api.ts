import type { Area, LinkItem, GalleryItem, CustomSectionItem, TeamMemberItem, FetchProfileResponse } from "./types"

/**
 * Throws an Error whose message is safe to show the user: the API's own `error` for 4xx
 * (validation messages are written in pt-BR), a size hint for 413, the fallback otherwise.
 */
export async function ensureOk(res: Response, fallback: string) {
  if (res.ok) return
  let message = fallback
  if (res.status === 401) {
    message = "Sua sessão expirou. Entre novamente para salvar."
  } else if (res.status === 413) {
    message = "Arquivo muito grande. Envie uma imagem menor."
  } else if (res.status < 500) {
    const data = await res.json().catch(() => null)
    if (data && typeof data.error === "string" && data.error) message = data.error
  }
  throw new Error(message)
}

export async function fetchProfile() {
  const res = await fetch("/api/profile", { cache: "no-store" })
  await ensureOk(res, "Falha ao carregar perfil")
  return res.json() as Promise<FetchProfileResponse>
}

export async function updateProfile(data: FormData) {
  const res = await fetch("/api/profile", { method: "PATCH", body: data })
  await ensureOk(res, "Falha ao salvar perfil")
  return res.json()
}

export async function createArea() {
  const res = await fetch("/api/activity-areas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Nova área", description: "Descrição da área." }) })
  await ensureOk(res, "Falha ao criar área")
  return res.json() as Promise<{ area: Area }>
}

export async function patchArea(area: Area) {
  const res = await fetch("/api/activity-areas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(area) })
  await ensureOk(res, "Falha ao salvar área")
  return res.json() as Promise<{ area: Area }>
}

export async function reorderAreas(order: { id: string; position: number }[]) {
  const res = await fetch("/api/activity-areas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  await ensureOk(res, "Falha ao reordenar áreas")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteArea(id: string) {
  const res = await fetch(`/api/activity-areas?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  await ensureOk(res, "Falha ao excluir área")
  return res.json() as Promise<{ ok: boolean }>
}

export async function createLink() {
  const res = await fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Novo link", description: "", url: "https://" }) })
  await ensureOk(res, "Falha ao criar link")
  return res.json() as Promise<{ link: LinkItem }>
}

export async function patchLink(link: LinkItem) {
  const res = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(link) })
  await ensureOk(res, "Falha ao salvar link")
  return res.json() as Promise<{ link: LinkItem }>
}

export async function reorderLinks(order: { id: string; position: number }[]) {
  const res = await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  await ensureOk(res, "Falha ao reordenar links")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteLink(id: string) {
  const res = await fetch(`/api/links?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  await ensureOk(res, "Falha ao excluir link")
  return res.json() as Promise<{ ok: boolean }>
}

export async function updateSectionConfig(data: { sectionOrder?: string[]; sectionLabels?: Record<string, string>; sectionIcons?: Record<string, string>; sectionTitleHidden?: Record<string, boolean> }) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await ensureOk(res, "Falha ao salvar configuração das seções")
  return res.json()
}

export async function uploadGalleryPhoto(file: File) {
  const fd = new FormData()
  fd.set("cover", file)
  const res = await fetch("/api/gallery", { method: "POST", body: fd })
  await ensureOk(res, "Falha ao enviar foto")
  return res.json() as Promise<{ item: GalleryItem }>
}

export async function reorderGallery(order: { id: string; position: number }[]) {
  const res = await fetch("/api/gallery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  await ensureOk(res, "Falha ao reordenar galeria")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteGallery(id: string) {
  const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  await ensureOk(res, "Falha ao excluir foto da galeria")
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

export async function createTeamMember(formData: FormData) {
  const res = await fetch("/api/team-members", { method: "POST", body: formData })
  await ensureOk(res, "Falha ao criar membro")
  return res.json() as Promise<{ member: TeamMemberItem }>
}

export async function patchTeamMember(id: string, formData: FormData) {
  formData.set("id", id)
  const res = await fetch("/api/team-members", { method: "PATCH", body: formData })
  await ensureOk(res, "Falha ao salvar membro")
  return res.json() as Promise<{ member: TeamMemberItem }>
}

export async function reorderTeamMembers(order: { id: string; position: number }[]) {
  const res = await fetch("/api/team-members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) })
  await ensureOk(res, "Falha ao reordenar equipe")
  return res.json() as Promise<{ ok: boolean }>
}

export async function deleteTeamMember(id: string) {
  const res = await fetch(`/api/team-members?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  await ensureOk(res, "Falha ao excluir membro")
  return res.json() as Promise<{ ok: boolean }>
}
