"use client"

import { Camera, Upload, X, Landmark, Sparkles, Briefcase } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import { useEditForm } from "../EditFormContext"

const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false })

export default function EstiloSection() {
  const {
    theme, setTheme, updateThemeMutation,
    primaryColor, setPrimaryColor,
    secondaryColor, setSecondaryColor,
    textColor, setTextColor,
    previewUrl, setPreviewUrl,
    setPhotoFile,
    setRemoveAvatar,
    coverPreviewUrl, setCoverPreviewUrl,
    setCoverFile,
    setRemoveCover,
    // Avatar cropper
    avatarCropOpen, setAvatarCropOpen,
    avatarCropSrc, setAvatarCropSrc,
    pendingAvatarFileRef,
    crop, setCrop,
    zoom, setZoom,
    croppedAreaPixels, setCroppedAreaPixels,
    // Cover cropper
    coverCropOpen, setCoverCropOpen,
    coverCropSrc, setCoverCropSrc,
    pendingCoverFileRef,
    coverCrop, setCoverCrop,
    coverZoom, setCoverZoom,
    coverCroppedAreaPixels, setCoverCroppedAreaPixels,
    getCroppedBlob,
  } = useEditForm()

  return (
    <>
      <div className="space-y-4">
        {/* Tema */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Label className="mb-3 text-base block font-bold">Tema</Label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "classic", label: "Clássico", icon: Landmark },
              { value: "modern", label: "Moderno", icon: Sparkles },
              { value: "corporate", label: "Corporativo", icon: Briefcase },
            ] as const).map((item) => {
              const selected = theme === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={async () => { setTheme(item.value); try { await updateThemeMutation.mutateAsync(item.value) } catch {} }}
                  className={`cursor-pointer flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                    selected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/50"
                  }`}
                >
                  <item.icon className={`h-6 w-6 ${selected ? "text-primary" : ""}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cores */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Label className="mb-3 text-base block font-bold">Cores</Label>
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="primaryColor" className="mb-2 block text-sm">Cor Principal</Label>
              <input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-20 w-20 border border-border bg-card rounded" />
            </div>
            <div>
              <Label htmlFor="secondaryColor" className="mb-2 block text-sm">Cor de Títulos</Label>
              <input id="secondaryColor" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-20 w-20 border border-border bg-card rounded" />
            </div>
            <div>
              <Label htmlFor="textColor" className="mb-2 block text-sm">Cor do Texto</Label>
              <input id="textColor" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-20 w-20 border border-border bg-card rounded" />
            </div>
          </div>
        </div>

        {/* Foto de Perfil */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Label className="mb-3 text-base block font-bold">Foto de perfil</Label>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative h-32 w-32">
              <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-border">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Pré-visualização do avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <Camera className="h-5 w-5" />
                  </div>
                )}
              </div>
              {previewUrl && (
                <button type="button"
                  onClick={() => { setPhotoFile(null); setPreviewUrl(null); setRemoveAvatar(true) }}
                  className="absolute -right-2 -top-2 z-50 rounded-full border border-border bg-background/90 p-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-muted"
                  aria-label="Remover foto">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm cursor-pointer hover:bg-primary/90">
                <Upload className="w-4 h-4" />
                <span>Enviar foto</span>
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

        {/* Capa */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Label className="mb-3 text-base block font-bold">Capa da página</Label>
          <div className="flex flex-col gap-4">
            <div>
              <label className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm cursor-pointer hover:bg-primary/90">
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
            <div className="relative h-44 w-full overflow-hidden rounded-md ring-2 ring-border">
              {coverPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreviewUrl} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-xs text-center px-1">Capa</div>
              )}
              {coverPreviewUrl && (
                <button type="button"
                  onClick={() => { setCoverFile(null); setCoverPreviewUrl(null); setRemoveCover(true) }}
                  className="absolute right-2 top-2 z-50 rounded-full border border-border bg-background/90 p-1.5 text-foreground shadow-lg backdrop-blur-sm hover:bg-muted"
                  aria-label="Remover capa">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cover Crop Dialog */}
      <Dialog open={coverCropOpen} onOpenChange={(v) => setCoverCropOpen(v)}>
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ajustar capa da página</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[50vh] bg-muted rounded-md overflow-hidden">
            {coverCropSrc && (
              // @ts-expect-error dynamic import type
              <Cropper image={coverCropSrc} crop={coverCrop} zoom={coverZoom} aspect={16/9} restrictPosition={false} showGrid={false}
                onCropChange={setCoverCrop} onZoomChange={setCoverZoom}
                onCropComplete={(_, areaPixels) => setCoverCroppedAreaPixels(areaPixels)} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Zoom</Label>
              <input type="range" min={1} max={3} step={0.01} value={coverZoom} onChange={(e) => setCoverZoom(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
          <DialogFooter className="flex flex-col md:flex-row gap-3">
            <Button type="button" className="cursor-pointer" onClick={async () => {
              if (!coverCropSrc || !coverCroppedAreaPixels) return
              try {
                const blob = await getCroppedBlob(coverCropSrc, coverCroppedAreaPixels)
                const fileName = pendingCoverFileRef.current?.name || "cover.jpg"
                const croppedFile = new File([blob], fileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
                setCoverFile(croppedFile)
                const url = URL.createObjectURL(croppedFile)
                setCoverPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
              } finally {
                setCoverCropOpen(false); setCoverCropSrc(null); pendingCoverFileRef.current = null
              }
            }}>Salvar recorte</Button>
            <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => {
              setCoverCropOpen(false); setCoverCropSrc(null); pendingCoverFileRef.current = null
            }}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      <Dialog open={avatarCropOpen} onOpenChange={(v) => setAvatarCropOpen(v)}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-80 bg-muted rounded-md overflow-hidden">
            {avatarCropSrc && (
              // @ts-expect-error dynamic import type
              <Cropper image={avatarCropSrc} crop={crop} zoom={zoom} aspect={1} restrictPosition={false} showGrid={false}
                onCropChange={setCrop} onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Zoom</Label>
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
          <DialogFooter className="flex flex-col md:flex-row gap-3">
            <Button type="button" className="cursor-pointer" onClick={async () => {
              if (!avatarCropSrc || !croppedAreaPixels) return
              try {
                const blob = await getCroppedBlob(avatarCropSrc, croppedAreaPixels)
                const fileName = pendingAvatarFileRef.current?.name || "avatar.jpg"
                const croppedFile = new File([blob], fileName.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
                setPhotoFile(croppedFile)
                const url = URL.createObjectURL(croppedFile)
                setPreviewUrl((prev) => { if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev); return url })
              } finally {
                setAvatarCropOpen(false); setAvatarCropSrc(null); pendingAvatarFileRef.current = null
              }
            }}>Salvar recorte</Button>
            <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => {
              setAvatarCropOpen(false); setAvatarCropSrc(null); pendingAvatarFileRef.current = null
            }}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
