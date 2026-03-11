"use client"

import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useEditForm } from "../EditFormContext"

export default function EnderecoSection() {
  const { form } = useEditForm()
  const { register, control } = form

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
            <Input id="zipCode" placeholder="00000-000"
              {...register("zipCode", {
                onChange: (e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                  const masked = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v
                  e.target.value = masked
                }
              })} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="street" className="mb-1 block text-sm">Endereço</Label>
            <Input id="street" {...register("street")} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="number" className="mb-1 block text-sm">Número</Label>
            <Input id="number" {...register("number")} />
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="complement" className="mb-1 block text-sm">Complemento</Label>
            <Input id="complement" {...register("complement")} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="neighborhood" className="mb-1 block text-sm">Bairro</Label>
            <Input id="neighborhood" {...register("neighborhood")} />
          </div>
          <div>
            <Label htmlFor="city" className="mb-1 block text-sm">Cidade</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div>
            <Label htmlFor="state" className="mb-1 block text-sm">Estado</Label>
            <Input id="state" placeholder="UF" maxLength={2} {...register("state")} />
          </div>
        </div>
      </div>
    </div>
  )
}
