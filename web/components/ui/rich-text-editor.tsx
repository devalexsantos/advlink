"use client"

import { useEditor, EditorContent, type Extension } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import { Color } from "@tiptap/extension-color"
import { TextStyle, FontSize } from "@tiptap/extension-text-style"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useRef } from "react"
import { marked } from "marked"
import { RichTextToolbar } from "./rich-text-toolbar"

function normalizeContent(content: string): string {
  if (!content) return ""
  const hasHtmlTags = /<(?:p|div|h[1-6]|ul|ol|li|blockquote|span|strong|em|a)\b/i.test(content)
  if (hasHtmlTags) return content
  return marked.parse(content, { breaks: true }) as string
}

type RichTextEditorProps = {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  toolbarVariant?: "full" | "minimal"
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "",
  className = "",
  minHeight = "200px",
  toolbarVariant = "full",
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const initialContentRef = useRef(normalizeContent(content))

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }) as Extension,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContentRef.current,
    onUpdate: ({ editor: e }) => {
      onChangeRef.current(e.getHTML())
    },
  })

  // Sync external content changes (e.g. when switching between areas)
  const prevContentRef = useRef(content)
  useEffect(() => {
    if (!editor || content === prevContentRef.current) return
    prevContentRef.current = content
    const normalized = normalizeContent(content)
    // Only update if significantly different (avoids loops from HTML normalization)
    if (editor.getHTML() !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className={`tiptap-editor border border-input rounded-md overflow-hidden bg-background ${className}`}>
      <RichTextToolbar editor={editor} variant={toolbarVariant} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3"
        style={{ minHeight }}
      />
    </div>
  )
}
