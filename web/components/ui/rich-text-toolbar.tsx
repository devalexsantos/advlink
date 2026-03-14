"use client"

import { type Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Underline,
  Undo2,
  Redo2,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  Palette,
  Highlighter,
  Type,
} from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const TEXT_COLORS = [
  { label: "Preto", value: "#000000" },
  { label: "Cinza", value: "#6b7280" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Amarelo", value: "#ca8a04" },
  { label: "Verde", value: "#16a34a" },
  { label: "Azul", value: "#2563eb" },
  { label: "Roxo", value: "#9333ea" },
  { label: "Rosa", value: "#db2777" },
  { label: "Marrom", value: "#92400e" },
]

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rosa", value: "#fbcfe8" },
  { label: "Roxo", value: "#e9d5ff" },
  { label: "Laranja", value: "#fed7aa" },
  { label: "Vermelho", value: "#fecaca" },
  { label: "Cinza", value: "#e5e7eb" },
]

const FONT_SIZES = [
  { label: "Pequeno", value: "12px" },
  { label: "Normal", value: "" },
  { label: "Grande", value: "20px" },
  { label: "Maior", value: "24px" },
]

const HEADINGS = [
  { label: "Parágrafo", level: 0 },
  { label: "Título 2", level: 2 },
  { label: "Título 3", level: 3 },
  { label: "Título 4", level: 4 },
] as const

type ToolbarProps = {
  editor: Editor
  variant?: "full" | "minimal"
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center h-7 w-7 rounded text-sm transition-colors
        ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  )
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-1" />
}

export function RichTextToolbar({ editor, variant = "full" }: ToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("")
  const [linkOpen, setLinkOpen] = useState(false)

  const isMinimal = variant === "minimal"

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-2 py-1.5 bg-muted/30">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <ToolbarSep />

      {/* Bold / Italic / Underline */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>

      {!isMinimal && (
        <>
          <ToolbarSep />

          {/* Font Size */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Tamanho da fonte"
                className="inline-flex items-center justify-center h-7 px-1.5 rounded text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
              >
                <Type className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.label}
                  type="button"
                  onClick={() => {
                    if (size.value) {
                      (editor.chain().focus() as unknown as { setFontSize: (v: string) => { run: () => void } }).setFontSize(size.value).run()
                    } else {
                      (editor.chain().focus() as unknown as { unsetFontSize: () => { run: () => void } }).unsetFontSize().run()
                    }
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent cursor-pointer"
                >
                  {size.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <ToolbarSep />

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Cor do texto"
                className="inline-flex items-center justify-center h-7 w-7 rounded text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-5 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => editor.chain().focus().setColor(c.value).run()}
                    className="h-6 w-6 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="w-full text-xs text-muted-foreground mt-2 hover:text-foreground cursor-pointer"
              >
                Remover cor
              </button>
            </PopoverContent>
          </Popover>

          {/* Highlight Color */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Cor de fundo"
                className="inline-flex items-center justify-center h-7 w-7 rounded text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
              >
                <Highlighter className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
                    className="h-6 w-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                className="w-full text-xs text-muted-foreground mt-2 hover:text-foreground cursor-pointer"
              >
                Remover destaque
              </button>
            </PopoverContent>
          </Popover>

          <ToolbarSep />

          {/* Link */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Link"
                className={`inline-flex items-center justify-center h-7 w-7 rounded text-sm transition-colors cursor-pointer
                  ${editor.isActive("link") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
              >
                {editor.isActive("link") ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              {editor.isActive("link") ? (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run()
                    setLinkOpen(false)
                  }}
                  className="w-full text-sm text-destructive hover:underline cursor-pointer"
                >
                  Remover link
                </button>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        if (linkUrl) {
                          editor.chain().focus().setLink({ href: linkUrl, target: "_blank" }).run()
                          setLinkUrl("")
                          setLinkOpen(false)
                        }
                      }
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-input rounded bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (linkUrl) {
                        editor.chain().focus().setLink({ href: linkUrl, target: "_blank" }).run()
                        setLinkUrl("")
                        setLinkOpen(false)
                      }
                    }}
                    className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <ToolbarSep />

          {/* Headings */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Títulos"
                className="inline-flex items-center justify-center h-7 px-1.5 rounded text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
              >
                <Pilcrow className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {HEADINGS.map((h) => (
                <button
                  key={h.label}
                  type="button"
                  onClick={() => {
                    if (h.level === 0) {
                      editor.chain().focus().setParagraph().run()
                    } else {
                      editor.chain().focus().toggleHeading({ level: h.level }).run()
                    }
                  }}
                  className={`w-full text-left px-2 py-1.5 text-sm rounded cursor-pointer
                    ${h.level === 0 && !editor.isActive("heading") ? "bg-accent" : ""}
                    ${h.level !== 0 && editor.isActive("heading", { level: h.level }) ? "bg-accent" : ""}
                    hover:bg-accent`}
                >
                  {h.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <ToolbarSep />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Lista com marcadores"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Lista numerada"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
        </>
      )}
    </div>
  )
}
