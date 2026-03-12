"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Paperclip, X } from "lucide-react"

export default function NewTicketPage() {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("support")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
    e.target.value = ""
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("subject", subject)
      formData.append("category", category)
      formData.append("message", message)
      for (const file of files) {
        formData.append("images", file)
      }

      const res = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Erro ao criar ticket")
        return
      }

      const ticket = await res.json()
      router.push(`/profile/tickets/${ticket.id}`)
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Novo Ticket</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Descreva brevemente o assunto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="billing">Cobrança</SelectItem>
                  <SelectItem value="bug">Bug / Erro</SelectItem>
                  <SelectItem value="feature_request">Sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva em detalhes o que precisa..."
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Anexar imagens
              </Button>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-16 w-16 rounded-md object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Ticket"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
