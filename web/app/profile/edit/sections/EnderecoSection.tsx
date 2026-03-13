"use client"

import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useEditForm } from "../EditFormContext"

export default function EnderecoSection() {
  const { form } = useEditForm()
  const { control } = form

  return (
    <div className="space-y-4">
      {/* Visibilidade */}
      <div className="rounded-xl border border-border bg-card p-5">
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
      </div>

      {/* Campos de endereço */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <Label className="text-base font-bold">Dados do endereço</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="zipCode" className="mb-1 block text-sm">CEP</Label>
            <Controller
              control={control}
              name="zipCode"
              render={({ field }) => (
                <Input
                  id="zipCode"
                  placeholder="00000-000"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
                    const masked = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw
                    field.onChange(masked)
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="street" className="mb-1 block text-sm">Endereço</Label>
            <Controller
              control={control}
              name="street"
              render={({ field }) => (
                <Input id="street" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="number" className="mb-1 block text-sm">Número</Label>
            <Controller
              control={control}
              name="number"
              render={({ field }) => (
                <Input id="number" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="complement" className="mb-1 block text-sm">Complemento</Label>
            <Controller
              control={control}
              name="complement"
              render={({ field }) => (
                <Input id="complement" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="neighborhood" className="mb-1 block text-sm">Bairro</Label>
            <Controller
              control={control}
              name="neighborhood"
              render={({ field }) => (
                <Input id="neighborhood" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </div>
          <div>
            <Label htmlFor="city" className="mb-1 block text-sm">Cidade</Label>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Input id="city" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </div>
          <div>
            <Label htmlFor="state" className="mb-1 block text-sm">Estado</Label>
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Input id="state" placeholder="UF" maxLength={2} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
