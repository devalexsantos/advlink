"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, ArrowRight, Camera, Upload, X, ImagePlus } from "lucide-react"
import dynamic from "next/dynamic"

// Lazy load cropper for client only
const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false })

const profileSchema = z.object({
  photo: z
    .instanceof(File)
    .optional()
    .or(z.undefined()),
  displayName: z
    .string()
    .min(2, { message: "Informe pelo menos 2 caracteres." })
    .max(60, { message: "Máximo de 60 caracteres." }),
  headline: z
    .string()
    .max(120, { message: "Máximo de 120 caracteres." })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  areas: z
    .array(z.string().min(1))
    .min(1, { message: "Adicione pelo menos uma área de atuação." }),
  about: z
    .string()
    .max(600, { message: "Máximo de 600 caracteres." })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .email({ message: "Informe um e-mail válido." })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  calendlyUrl: z
    .string()
    .url("Informe uma URL válida.")
    .regex(/^https:\/\/calendly\.com\//i, "A URL deve iniciar com https://calendly.com/")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  cellphone: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  instagramUrl: z
    .string()
    .url("Informe uma URL válida.")
    .regex(/^https:\/\/(www\.)?instagram\.com\//i, "A URL deve iniciar com https://instagram.com/")
    .optional()
    .or(z.literal("").transform(() => undefined)),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const defaultAreaSuggestions = [
  "Civil",
  "Penal",
  "Trabalhista",
  "Tributário",
  "Família",
  "Médico",
  "Consumidor",
  "Imobiliário",
  "Empresarial",
  "Previdenciário",
]

export function ProfileForm() {
  const router = useRouter()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [areaInput, setAreaInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const totalSteps = 5
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Cropper state for avatar
  const [avatarCropOpen, setAvatarCropOpen] = useState<boolean>(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const pendingAvatarFileRef = useRef<File | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  // rotation removed
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      photo: undefined,
      displayName: "",
      headline: "",
      areas: [],
      about: "",
      email: "",
      phone: "",
      calendlyUrl: "",
      cellphone: "",
      instagramUrl: "",
    },
    mode: "onBlur",
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors, isSubmitting },
  } = form
  function formatPhoneBR(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    const d = digits
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  function formatCellphoneBR(value: string): string {
    // Força padrão de celular (11 dígitos com nono)
    const digits = value.replace(/\D/g, "").slice(0, 11)
    const d = digits
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }


  const selectedAreas = watch("areas")
  const filteredSuggestions = useMemo(() => {
    const input = areaInput.trim().toLowerCase()
    if (!input) return defaultAreaSuggestions.filter(s => !selectedAreas.includes(s))
    return defaultAreaSuggestions.filter(
      s => s.toLowerCase().includes(input) && !selectedAreas.includes(s)
    )
  }, [areaInput, selectedAreas])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleAddArea(tag: string) {
    const value = tag.trim()
    if (!value) return
    if (selectedAreas.includes(value)) return
    const next = [...selectedAreas, value]
    setValue("areas", next, { shouldValidate: true })
    setAreaInput("")
  }

  function handleRemoveArea(tag: string) {
    const next = selectedAreas.filter(t => t !== tag)
    setValue("areas", next, { shouldValidate: true })
  }

  function handlePhotoChange(file?: File) {
    if (!file) {
      setValue("photo", undefined, { shouldValidate: true })
      setPreviewUrl(null)
      return
    }
    setValue("photo", file, { shouldValidate: true })
    const url = URL.createObjectURL(file)
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  // rotation helpers removed

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

  async function onSubmit(values: ProfileFormValues) {
    const { photo, displayName, headline, areas, about, email, phone, calendlyUrl, instagramUrl } = values
    const formData = new FormData()
    formData.set("displayName", displayName)
    formData.set("areas", JSON.stringify(areas))
    if (about) formData.set("about", about)
    if (headline) formData.set("headline", headline)
    if (email) formData.set("email", email)
    if (phone) formData.set("phone", phone)
    if (calendlyUrl) formData.set("calendlyUrl", calendlyUrl)
    const cellphoneValue = watch("cellphone")
    if (cellphoneValue) formData.set("cellphone", cellphoneValue)
    if (instagramUrl) formData.set("instagramUrl", instagramUrl)
    if (photo) formData.set("photo", photo)

    const res = await fetch("/api/onboarding/profile", {
      method: "POST",
      body: formData,
    })
    if (!res.ok) {
      // eslint-disable-next-line no-alert
      alert("Falha ao salvar. Tente novamente.")
      return
    }
    // Upload gallery files if any
    if (galleryFiles.length > 0) {
      await Promise.all(
        galleryFiles.map(async (file) => {
          const fd = new FormData()
          fd.set("cover", file)
          await fetch("/api/gallery", { method: "POST", body: fd })
        })
      )
    }
    router.replace("/profile/edit")
  }

  

  async function handleNext() {
    if (currentStep === 1) {
      const ok = await trigger(["displayName"])
      if (!ok) return
      setCurrentStep(2)
      return
    }
    if (currentStep === 2) {
      const ok = await trigger(["areas"])
      if (!ok) return
      setCurrentStep(3)
      return
    }
    if (currentStep === 3) {
      setCurrentStep(4)
      return
    }
    if (currentStep === 4) {
      setCurrentStep(5)
      return
    }
    if (currentStep === 5) {
      await handleSubmit(onSubmit)()
    }
  }

  function handlePrev() {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }

  function handleAddGalleryFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const next = [...galleryFiles]
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i)
      if (f) next.push(f)
    }
    setGalleryFiles(next)
  }

  function handleRemoveGalleryIndex(index: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl"
    >
      {/* Steps header + progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-300 mb-2 gap-2">
          {[
            "Sobre você ou seu escritório",
            "Áreas de atuação",
            "Informações para contato",
            "Fotos",
            "Social",
          ].map((label, idx) => (
            <div key={idx} className={`flex-1 text-center ${currentStep === idx + 1 ? "font-semibold text-zinc-100" : "opacity-70"}`}>
              {label}
            </div>
          ))}
        </div>
        <div className="h-2 w-full rounded bg-zinc-800 overflow-hidden">
          <div className="h-full bg-zinc-200 transition-all" style={{ width: `${(currentStep - 1) / (totalSteps - 1) * 100}%` }} />
        </div>
      </div>
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
                  handlePhotoChange(croppedFile)
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
      {/* STEP 1: Sobre você ou seu escritório */}
      {currentStep === 1 && (
      <>
      <h2 className="text-xl font-semibold mb-4">Sobre você ou seu escritório</h2>
      {/* Foto de Perfil */}
      <div className="mb-8">
        <Label className="mb-2 block text-sm font-medium text-zinc-200">
          Foto de perfil
        </Label>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-zinc-800">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Pré-visualização do avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-400">
                <Camera className="h-6 w-6" />
              </div>
            )}
            <button
              type="button"
              onClick={() => handlePhotoChange(undefined)}
              className="absolute -right-2 -top-2 rounded-full border border-zinc-700 bg-zinc-800 p-1 text-zinc-300 shadow hover:bg-zinc-700"
              aria-label="Remover foto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                pendingAvatarFileRef.current = f
                const reader = new FileReader()
                reader.onload = () => {
                  setAvatarCropSrc(reader.result as string)
                  setZoom(1)
                  setCrop({ x: 0, y: 0 })
                  setAvatarCropOpen(true)
                }
                reader.readAsDataURL(f)
              }}
            />
            <Button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
              Enviar foto
            </Button>
          </div>
        </div>
        {errors.photo && (
          <p className="mt-2 text-sm text-red-400">{String(errors.photo.message)}</p>
        )}
      </div>

      {/* Título (headline) */}
      <div className="mb-8">
        <Label htmlFor="headline" className="mb-2 block text-sm font-medium text-zinc-200">
          Título
        </Label>
        <Input id="headline" type="text" placeholder="Ex.: Advogado (a) especialista em ..." {...register("headline")} />
        {errors.headline && (<p className="mt-2 text-sm text-red-400">{errors.headline.message as string}</p>)}
      </div>

      {/* Celular */}
      <div className="mb-8">
        <Label htmlFor="cellphone" className="mb-2 block text-sm font-medium text-zinc-200">
          WhatsApp para contato
        </Label>
        <Controller
          control={control}
          name="cellphone"
          render={({ field }) => (
            <Input
              id="cellphone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 91234-5678"
              value={field.value}
              onChange={(e) => field.onChange(formatCellphoneBR(e.target.value))}
            />
          )}
        />
        {errors.cellphone && (
          <p className="mt-2 text-sm text-red-400">{errors.cellphone.message}</p>
        )}
      </div>

      {/* Nome de exibição */}
      <div className="mb-8">
        <Label htmlFor="displayName" className="mb-2 block text-sm font-medium text-zinc-200">
          Nome de exibição <span className="text-red-500" aria-hidden>*</span>
        </Label>
        <Input
          id="displayName"
          type="text"
          placeholder="Seu nome para ser exibido"
          {...register("displayName")}
        />
        {errors.displayName && (
          <p className="mt-2 text-sm text-red-400">{errors.displayName.message}</p>
        )}
      </div>

      </>
      )}

      {/* STEP 2: Áreas de atuação */}
      {currentStep === 2 && (
      <>
      <h2 className="text-xl font-semibold mb-4">Áreas de atuação</h2>
      {/* Áreas de atuação */}
      <div className="mb-8">
        <Label className="mb-2 block text-sm font-medium text-zinc-200">
          Áreas de atuação <span className="text-red-500" aria-hidden>*</span>
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          {selectedAreas.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveArea(tag)}
                className="ml-1 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                aria-label={`Remover ${tag}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="text"
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddArea(areaInput)
              }
            }}
            placeholder="Digite uma área e pressione Enter"
          />
          <Button type="button" variant="secondary" onClick={() => handleAddArea(areaInput)}>
            Adicionar
          </Button>
        </div>
        {filteredSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddArea(s)}
                className="rounded-full border border-zinc-800 bg-zinc-800/40 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {errors.areas && (
          <p className="mt-2 text-sm text-red-400">{errors.areas.message as string}</p>
        )}
      </div>

      </>
      )}

      {/* STEP 3: Informações para contato */}
      {currentStep === 3 && (
      <>
      <h2 className="text-xl font-semibold mb-4">Informações para contato</h2>
      {/* Sobre mim */}
      <div className="mb-4">
        <Label htmlFor="about" className="mb-2 block text-sm font-medium text-zinc-200">
          Sobre
        </Label>
        <Textarea
          id="about"
          rows={4}
          placeholder="Conte um pouco mais sobre você ou seu escritório"
          {...register("about")}
        />
        {errors.about && (
          <p className="mt-2 text-sm text-red-400">{errors.about.message as string}</p>
        )}
      </div>

      {/* E-mail (opcional) */}
      <div className="mb-4">
        <Label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-200">
          E-mail para contato
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Telefone (opcional) */}
      <div className="mb-4">
        <Label htmlFor="phone" className="mb-2 block text-sm font-medium text-zinc-200">
          Telefone adicional para contato
        </Label>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 91234-5678"
              value={field.value}
              onChange={(e) => field.onChange(formatPhoneBR(e.target.value))}
            />
          )}
        />
        {errors.phone && (
          <p className="mt-2 text-sm text-red-400">{errors.phone.message}</p>
        )}
      </div>

      </>
      )}

      {/* STEP 4: Fotos */}
      {currentStep === 4 && (
      <>
      <h2 className="text-xl font-semibold mb-4">Fotos</h2>
      <div
        className={`rounded-xl border border-dashed ${isDragging ? "border-zinc-200 bg-zinc-800/50" : "border-zinc-700 bg-zinc-900/30"} p-6 text-center`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleAddGalleryFiles(e.dataTransfer.files) }}
      >
        <div className="flex flex-col items-center gap-2">
          <ImagePlus className="w-8 h-8 text-zinc-300" />
          <p className="text-sm text-zinc-300">Arraste e solte suas fotos aqui</p>
          <p className="text-xs text-zinc-500">ou</p>
          <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => document.getElementById("gallery-input")?.click()}>Selecionar imagens</Button>
          <input id="gallery-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleAddGalleryFiles(e.target.files)} />
        </div>
      </div>
      {galleryFiles.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {galleryFiles.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="relative h-24 w-full overflow-hidden rounded-md ring-1 ring-zinc-800">
              <img src={URL.createObjectURL(file)} alt="Prévia" className="h-full w-full object-cover" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
              <button
                type="button"
                aria-label="Remover imagem"
                onClick={() => handleRemoveGalleryIndex(idx)}
                className="absolute right-1 top-1 z-10 rounded-full bg-zinc-50 text-zinc-900 p-1 shadow-md border border-zinc-200 hover:bg-zinc-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* STEP 5: Social */}
      {currentStep === 5 && (
      <>
      <h2 className="text-xl font-semibold mb-4">Social</h2>
      {/* Instagram URL (opcional) */}
      <div className="mb-4">
        <Label htmlFor="instagramUrl" className="mb-2 block text-sm font-medium text-zinc-200">
          Instagram URL
        </Label>
        <Input id="instagramUrl" type="url" placeholder="https://instagram.com/seu_usuario" {...register("instagramUrl")} />
        {errors.instagramUrl && (
          <p className="mt-2 text-sm text-red-400">{errors.instagramUrl.message as string}</p>
        )}
      </div>

      {/* Calendly URL (opcional) */}
      <div className="mb-6">
        <Label htmlFor="calendlyUrl" className="mb-2 block text-sm font-medium text-zinc-200">
          Calendly URL
        </Label>
        <Input id="calendlyUrl" type="url" placeholder="https://calendly.com/seu-usuario" {...register("calendlyUrl")} />
        {errors.calendlyUrl && (
          <p className="mt-2 text-sm text-red-400">{errors.calendlyUrl.message as string}</p>
        )}
      </div>
      </>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" className="cursor-pointer" onClick={handlePrev} disabled={currentStep === 1 || isSubmitting}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button type="button" onClick={handleNext} disabled={isSubmitting} className="cursor-pointer">
          {isSubmitting ? "Criando sua página, aguarde..." : currentStep === 5 ? "Salvar e concluir" : "Avançar"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </form>
  )
}