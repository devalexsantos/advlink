import { marked } from "marked"
import { sanitizeRichText } from "@/lib/sanitize-rich-text"

export function renderContent(content: string | null | undefined): string {
  if (!content) return ""
  const hasHtmlTags = /<(?:p|div|h[1-6]|ul|ol|li|blockquote|span|strong|em|a)\b/i.test(content)
  const html = hasHtmlTags ? content : (marked.parse(content, { breaks: true }) as string)
  return sanitizeRichText(html)
}
