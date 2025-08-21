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
import { ArrowRight, Camera, Upload, X } from "lucide-react"

const profileSchema = z.object({
  photo: z
    .instanceof(File)
    .optional()
    .or(z.undefined()),
  displayName: z
    .string()
    .min(2, { message: "Informe pelo menos 2 caracteres." })
    .max(60, { message: "Máximo de 60 caracteres." }),
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

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      photo: undefined,
      displayName: "",
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

  async function onSubmit(values: ProfileFormValues) {
    const { photo, displayName, areas, about, email, phone, calendlyUrl, instagramUrl } = values
    const formData = new FormData()
    formData.set("displayName", displayName)
    formData.set("areas", JSON.stringify(areas))
    if (about) formData.set("about", about)
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
    router.replace("/profile/edit")
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl"
    >
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
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
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

      <div className="flex items-center justify-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="w-full flex items-center gap-2 cursor-pointer">
          {isSubmitting ? "Criando sua página, aguarde..." : "Continuar"}
          <ArrowRight className="w-4 h-4" />
        </Button>
    </div>
    </form>
  )
}